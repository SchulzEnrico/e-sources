# Übergabe V69 → V70 E-Sources

Stand: 24.11.2026 · Chat V69 abgeschlossen (bei ca. 80 % Füllstand) · Nächster Chat: **V70 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V70 E-Sources**. Lies diese Übergabedatei, dann `V68_Uebergabe_E-Sources.md` (Nächste Schritte 2–7, Kleine Punkte – gelten weiter, soweit hier nicht erledigt) und im Lastenheft **F-213**, **F-214**, **F-215**. Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`). Lies `web/src/components/PadFooter.tsx`, `web/src/workspace/footArc.ts` und in `Pad.tsx` die Stellen „F-215“. Dann „Nächste Schritte“ ab 1.

## Links

- **Entscheidungs-Doc F-215 (V69):** https://claude.ai/artifact/A4EFLy6VomNN4v7hZdhoJb – mit Kommentaren, Antworten Enrico und Abschnitt „Konfliktprüfung“ (K1–K5). PDF `docs/Arbeitspakete/F-215_Fussleiste_Home-Knopf.pdf` (Stand vor Enricos Tabellen-Antworten und vor der Konfliktprüfung – bei Bedarf neu erzeugen: Claude schreibt die Markdown-Fassung, `pandoc` → docx → `soffice` → pdf in der VM von device_bash).
- **Entscheidungs-Doc F-213 (V68):** https://claude.ai/artifact/9JmFu92yyDGVNXNwHH4rbt
- Weitere Links: siehe V68.

## Was in V69 passiert ist

- V68 committet und gepusht, Tests auf dem Mac **363 grün**.
- **Strg/⌘+S** zum Speichern von Enrico bestätigt (Lastenheft F-213 S6).
- **Sammelmodus** (>START/<ENDE) nutzt Enrico nur, wenn er Schritt für Schritt mit Bildschirmfotos erklärt – sonst bleibt der Block leer.
- **A: Pad-Rahmen halb so breit ✓** – `.pad__body { margin: 0 3px 3px }`, Radius `calc(var(--radius) - 3px)`; von Enrico noch nicht angesehen.
- **F-215 Fußleiste mit Home-Knopf:** Doc angelegt, über Kommentare stark weiterentwickelt. Entschieden:
  - Fußleiste = **Teil des Pad-Gehäuses, wirkt physisch** (nicht Bildschirm); **F-213-Leiste bleibt innen in der Note** (nicht zusammenlegen).
  - Knopf **wie iPhone 7, ohne Quadrat** (vertiefter Kreis, feiner Ring in Akzentfarbe). Alles auf dem Bildschirm (Halbkreis, Hinweise) im **klaren iOS-10-Stil**.
  - **Tippen = Home** (zur Liste), **Halten = Halbkreis-Menü** mit 6 Einträgen: Zuletzt genutzt (180°), Neue Note (140°), **Sprachnotiz oben Mitte (90°)**, Neue Aufgabe (50°), Suche (18°), Bild & Teilen (−12°). Doppel-/Dreifachtippen entfallen.
  - **Drücken + kurz wischen links/rechts = Notes blättern, lang = Sheets blättern** (Fläche folgt dem Finger; während Aufnahme: links = Abbrechen). Tastatur: Pfeil links/rechts mit Fokus auf dem Knopf.
  - **Sprache nur lokal** (`processLocally`, heute nur Chrome/Edge Rechner, K1), kein Ton als Anhang, sonst Hinweis auf Diktat des Systems.
  - Ziel der Sprachnotiz (K2): Mikrofon = geöffnete Note (sonst neue); auf „Neue Note“ 0,5 s verweilen = neue Sprachnotiz; danach Meldung „Als neue Note lösen“ mit Rückgängig.
  - **Alt+H = Home, Alt+M = Sprachnotiz** (Alt+Leertaste geht unter Windows nicht, K3). Tastatur am Knopf (K4): Enter/Leertaste = Home, Pfeil hoch oder Leertaste halten = Halbkreis, Pfeile wählen, Enter, Esc.
  - **Bild & Teilen:** Teilen (Web Share API, Firefox → Herunterladen), Drucken/PDF (eigene Druckansicht), als Bild sichern, Kopieren.
  - F4 offen gelassen → Vorschlag gilt (Home = Liste). F9: **früh bauen**, in Schritten.
  - **K5 offen:** F10 „Dock ja, mit Zuordnungsmöglichkeit zu Notizen“ – Bedeutung mit Enrico klären.
- **F-215 Schritt 1 gebaut (nicht auf dem Mac getestet):** `PadFooter.tsx` (Knopf, Halbkreis `role=menu`, halten/ziehen/loslassen, Tastatur), `workspace/footArc.ts` (Anordnung/Auswahl, **3 neue Tests**), `FOOT_TEXT` in terms.ts, Symbole `mic`, `share`, `recent` in icons.ts, im Pad: Home → `NoteBlock` über `cmd`-Prop (Zähler, `done`-Ref gegen Auslösen beim Mounten), Neue Note aus dem Halbkreis, Alt+H. Übrige Einträge sichtbar, aber gesperrt („folgt im nächsten Schritt“). CSS `.padfoot*` am Ende von App.css (inkl. reduced-motion, forced-colors).
- **Randleiste statt verschwundener Liste (Wunsch Enrico):** unter 470 px Pad-Breite und offener Note wird `.nblock__side` 40 px schmal am linken Rand (Kürzel `.nblock__mono`, Titel als `title`, „+“ ohne Text); „Zur Liste“ dort ausgeblendet. **Beim Hovern bzw. mit Fokus darin (`:focus-within`) klappt sie über der Note aus** (bis 220 px, Hintergrund wie das Pad). Nicht getestet.
- **Tests:** In der VM von device_bash startet vitest nicht (Rollup-Linux-Modul fehlt, kein Netz). Typprüfung (`tsc --noEmit`) grün. **Auf dem Mac: 366 grün** (Enrico, 14:33).

## Nächste Schritte

1. **Enrico:** Tests 366 grün ✓. Im Browser prüfen: Fußleiste und Knopf (Aussehen „physisch“?), Tippen = Liste, Halten = Halbkreis (Ziehen und Loslassen auf „Neue Note“), Tastatur (Tab zum Knopf, Enter, Pfeil hoch, Pfeile, Esc, Alt+H), Randleiste im schmalen Pad, schmalerer Rand (A). Dann Commit (Text unten).
2. **K5** klären (Dock-Zuordnung).
3. **F-215 Schritt 2:** Wischen links/rechts (Notes/Sheets, Fläche folgt dem Finger, Hinweis „← Titel“), „Zuletzt genutzt“ (Liste der letzten 5 Notes/Sheets je Pad, Auswahl als kleiner Bogen oder Liste), Tastatur Pfeil links/rechts am Knopf.
4. **Schritt 3 Sprache** (nur lokal, Alt+M, Feststellen ↑, Abbrechen ←, Ansagen `aria-live`, Einstellung „Spracherkennung“), **Schritt 4** Neue Aufgabe + Suche, **Schritt 5** Bild & Teilen (neue Abhängigkeit `html-to-image` → Enrico installiert auf dem Mac), dann Dock (K5).
5. Danach weiter laut V68: F-214 Grundsatz-Doc, Umstieg P5 usw. (Reihenfolge mit Enrico; Funktion vor Design).

## Kleine Punkte (neu in V69)

- Hilfe/Begriffe (`help.ts`) für Home-Knopf, Halbkreis, Sprachnotiz, Feststellen fehlen noch.
- Halbkreis liegt innerhalb des Pads (`.pad { overflow: hidden }`) – bei sehr flachen Pads (< ca. 150 px) wird er oben abgeschnitten; ggf. Halbkreis kleiner oder außerhalb rendern.
- Eintrag bei −12° ragt leicht unter die Knopfmitte – im Browser prüfen.
- Alt+H fängt im Pad auch das „ª“ ab (Mac) – bewusst (K3).
- Leertaste-Halten öffnet den Halbkreis; Loslassen über einem Eintrag löst ihn nicht aus (`menuKeyUp`). Im Browser gegenprüfen (Klick-Ereignis bei Leertaste).
- Fußleiste erscheint in allen Sheet-Arten; Home/Neue Note wirken nur im Notizblock.
- PDF F-215 ist nicht auf dem letzten Stand (siehe Links).

## Commit-Text V69

**Repo e-sources – Summary:** `V69: Fußleiste mit Home-Knopf und Halbkreis (F-215 Schritt 1), Randleiste im schmalen Pad, Pad-Rand 3 px`

**Description:**
```
- Fußleiste als Teil des Pad-Gehäuses mit Home-Knopf im Stil des
  iPhone 7 (vertiefter Kreis, Ring in Akzentfarbe) – F-215 Schritt 1
- Tippen/Enter/Alt+H = zurück zur Liste; Halten, Pfeil hoch oder
  Leertaste halten = Halbkreis-Menü (role=menu, Pfeile, Enter, Esc)
- Halbkreis: Neue Note aktiv; Zuletzt, Sprachnotiz, Aufgabe, Suche,
  Bild & Teilen sichtbar, folgen
- Liste im schmalen Pad verschwindet nicht mehr: schmale Randleiste
  mit Kürzeln bei offener Note, klappt beim Hovern/Fokus aus
- Rand um die Notizfläche halb so breit (3 px)
- Lastenheft F-213 (Strg/⌘+S bestätigt), F-215 Entscheidungen und
  Schritt 1; Übergabe V69
- Tests 366 grün (3 neue für footArc)
```
