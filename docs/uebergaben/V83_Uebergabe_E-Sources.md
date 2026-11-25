# Übergabe V83 → V84 E-Sources

Stand: 25.11.2026, 09:55 · Chat V83 abgeschlossen · Nächster Chat: **V84 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V84 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 „Schritt 5“** (mit „Gebaut V83“), **F-216 Umschalt-Rad** (mit „Gebaut V83“), **F-217** und **NF-08**. Entscheidungen im Claude Doc „F-206 V82 – Knopf „Notes & Tasks“ und Cockpit (Schritt 5)“ (https://claude.ai/artifact/D4cigdE9w3Enmr94CFFwoU, PDF `docs/Arbeitspakete/F-206_V82_NotesTasks_Cockpit.pdf`). Arbeitsweise und Kernpunkte von Schritt 5 stehen in `V82_Uebergabe_E-Sources.md`. Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_`–`V82_Uebergabe_E-Sources.md` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V83 passiert ist

Tests **410 grün** (V82: 402; neu 6 Umschalt-Rad, 2 Rad „Pads“/Zwischenlage). `npx tsc --noEmit -p .` sauber. Kurz im eingebauten Browser angesehen (Testmodus), sonst Prüfung durch Enrico, wenn alles steht.

1. **Umschalt-Rad als Bauteil (F-216)** – ✓ gebaut
   - Logik `web/src/workspace/modeWheel.ts`: Rasten aus Scroll-Weg (40 px) bzw. Wischweg (24 px), Rest wird gesammelt, Umkehr verwirft ihn, höchstens 3 Rasten je Ruck; `turn` mit Anschlag oder ringsum (`wrapsFor`: ringsum ab 6 Modi), `clickTurn` (Klick am Ende = wieder vorn), `keyTurn` (Pfeile, Pos1/Ende, Enter/Leertaste), `valueText` („Notizen, 2 von 2“), `neighbours`, `turnFrom` (Zwischenlage), `COMMIT_MS = 300`.
   - Bauteil `web/src/components/ModeWheel.tsx`: `role="slider"`, `aria-roledescription` „Umschalt-Rad“; Scrollen über einen nicht passiven Listener (Seite scrollt nicht mit); Zeiger ziehen/wischen hoch/runter (Finger hoch = nächster); Klick = nächster, Umschalt+Klick = voriger; umgeschaltet wird 0,3 s nach der letzten Raste, angezeigt sofort. Namen rollen herein (auch ringsum), Walzen drehen je Raste (`--mw-turn`), Nachbarn halb sichtbar bei Hover/Fokus/Drehen. Props `between` (Zwischenlage, z. B. „Gemischt“) und `disabled` + `disabledHint`.
   - Gestaltung `.mwheel` am Ende von `App.css`: 28 px hoch wie die Kopfleisten-Knöpfe, Metallwalzen mit Riefen und Zylinder-Schatten, Hover/Fokus wie Knöpfe, „Bewegung reduzieren“ ohne Rollen, erzwungene Farben mit Rahmen.
   - **Abweichung zu U5:** Name verschwindet in der Kopfleiste schon ab 1100 px (und bei „Kompakt“) wie bei allen anderen Kopfleisten-Knöpfen – nicht erst ab 760 px (NF-08). Beim Testen mit Enrico klären.
   - Eingesetzt: **Desk | Notizen** in der Kopfzeile (alte Knopfgruppe `.tb-mode__btn` entfernt; Klasse `tb-mode` bleibt am Rad). Hilfe „Umschalt-Rad“ (Symbol `swap`), Hilfe „Desk oder Notizen“ angepasst. Texte `WHEEL_TEXT`.
2. **Knopf „Notizen & Aufgaben“ statt NewPad (F-206 Schritt 5, N1–N4, N11, N12)** – ✓ gebaut
   - Neues Symbol `notesTasks` (Blatt mit Haken), Knopf-Klasse `.tb-nt` (Zahl am Knopf wie D8, Klasse `.tb-newpad` bleibt dafür), schmal nur Symbol. Texte `NT_TEXT`.
   - Menü: Neues Pad · Platz wählen … (gesperrt bis F-210) · **Notiz suchen …** (fokussiert die Suche oben und schickt `esource:find` mit `{ kind: 'notes' }` – **noch kein Empfänger**, kommt mit Schritt 3) · **Rad „Pads“** · Rad „Desk | Notizen“ · Im Cockpit ordnen … (gesperrt bis Cockpit „Notizen“) · Deckkraft Pads/Dock · Hilfe zu Notizen & Aufgaben.
   - Rad „Pads“: `padsShow(loose, docked, hidden, dockOff)` in `pads.ts` (Test) → Verteilt (alle aus dem Dock, Dock an, Pads sichtbar) · Im Dock (alle ins Dock) · Ausgeblendet (Pads aus, Dock weg); sonst „Gemischt“ zwischen den Rasten; ohne Pads „Keine Pads“ und gesperrt, im Notizen-Modus gesperrt (Grund im Tooltip). Ansage nur für Bildschirmleser (`setPadsShow` in App.tsx). `togglePads` und `dockAllPads` sind weggefallen.
   - **Alt/⌥+N** öffnet das Menü (Fokus auf „Neues Pad“). Im Browser geprüft: Menü, Neues Pad, Rad „Pads“ durch alle drei Rasten, Zahl am Knopf.
   - Hilfe „Notizen & Aufgaben“ (Symbol `notesTasks`); Texte „NewPad › …“ in `PAD_TEXT.hidden`, `DOCK_TEXT.isOff` und Hilfe „Dock“ zeigen jetzt auf das Rad „Pads“. Neues Symbol `hide` (Auge durchgestrichen).
3. **Nachbesserung Rad (Enrico, Rückmeldungen im Chat):**
   - Drehgefühl wie das Überschrift-Rad: `ModeWheel` neu auf einem echten Scrollband (`.mwheel__win`, `scroll-snap`, Wölbung wie `Wheel` in `RemindPicker.tsx`) – folgt stufenlos Trackpad/Mausrad/Finger, rastet ein, umgeschaltet 0,3 s nach dem Einrasten (Klick/Pfeile drehen weich dorthin, im Test 0,4–0,7 s bis zum Umschalten). Ringsum: Band dreifach, springt unsichtbar in die Mitte. Maus ziehen = wischen. Walzen laufen stufenlos mit (`--mw-turn`).
   - Aussehen: außen Knopf wie „Überschrift H1“ im Pad (Neumorphism, ohne Rand), mittig die Mulde (`.mwheel__dial`: schwarzer Rand, Clay-Hintergrund) mit Walzen 22 px breit, wenig Abstand zu Symbol/Text; Nachbarn öffnen sich bei Hover/Fokus/Drehen (clip-path, 12 px über/unter dem Knopf). Option `glyph` für eigene Symbole.
   - Überschrift-Rad im Pad hat jetzt dieselben Walzen (::before/::after, laufen mit – `--mw-turn` in `Wheel.curve`).
   - Eingesetzt außerdem: **View** in der Kopfzeile (nur Symbole, `.mwheel--icons`, Klasse `tb-viewwheel`; Tour-Ziel angepasst; Anschlag Dashboard … Solo), **Cockpit Portale · Layouts · Library** („Sources“ heißt jetzt „Library“, Tour-Text angepasst; „Notizen“ kommt mit dem Cockpit-Schritt), **Darstellung** (ringsum, Gruppe klein vor dem Namen) und **Akzentfarbe** (ringsum, Farbpunkt + Name, „Eigene Farbe“ daneben; eigene Farbe = Zwischenlage) im Dialog „Design anpassen“.
   - Cockpit (Enrico): Rad sitzt ganz links direkt nach „Cockpit“ und verspringt nicht mehr (in allen drei Ansichten gleiche Stelle, geprüft); es ersetzt die Überschrift der Ansicht – „Layouts“ im Layout-Bereich ist nur noch für Bildschirmleser da. Die Umsortierung im schmalen Cockpit (`order: 1`) ist entfernt.
   - Noch **nicht** umgebaut (F-216 U6): Cockpit Regeln | Radar, Cockpit Layouts Vorschau (Gerät · Ausrichtung · Reihen), Zahnrad-Menü Ausrichtung und „Pause anzeigen nach“, Library Dieses Portal | Alle, Sprachnotiz In diese Notiz | Neue Notiz, Profil/Begrüßung.
   - Nicht geprüft im Browser: Darstellung/Akzentfarbe-Räder und das Cockpit-Rad (nur Typen + Tests); Überschrift-Rad mit Walzen nur gebaut.
4. Lastenheft: F-206 Schritt 5 und F-216 mit „Gebaut V83“, Zählzeile und Reihenfolge Punkt 31 nachgezogen.

## Nächste Schritte

0. **Erst Enricos Rückmeldung zum Rad** (Walzen, Drehgefühl, Überschrift-Rad, View, Cockpit, Darstellung, Akzentfarbe) einarbeiten, dann die übrigen Räder aus F-216 U6 (siehe Nachbesserung oben).
1. **Suche** (`components/Search.tsx`, Liste `items` um Zeile 90): gemeinsame Passung über alle Arten (beste Treffer oben), Art-Kennung (Symbol + farbige Kante + Wort), Chip-Zeile Alle · Portale · Sources · Notizen · Funktionen mit Zahl (Strg/⌃+←/→, Ansage), „Im Web suchen“ immer unten – mit Test (Passung als reine Funktion). **Empfänger für `esource:find`** (`kind: 'notes'` → Chip „Notizen“) einbauen. „Sources“ in der Suche → „Library“ (Kleiner Punkt V82).
2. **Cockpit** (`components/Overview.tsx`, Modi um Zeile 229): Umschalt-Rad Portale · Notizen · Layouts · Library; Ansicht „Notizen“ weitestgehend wie „Portale“, Pads im Radar, Verschieben zwischen Desks (Logik in `pads.ts` mit Test). Dann „Im Cockpit ordnen …“ im Menü „Notizen & Aufgaben“ freischalten.
3. Übrige Räder (F-216, U7): View, Cockpit Regeln | Radar, Darstellung (ringsum), Akzentfarbe (ringsum), dann der Rest der Liste in F-216.
4. Danach (N13): F6 reihum → To-do, Kanban, Eisenhower → Lageplan F-210 → Notiz ↔ Quelle → Personen + Projektfokus → Board → **Touren prüfen (F-217)**.
5. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V81 (siehe `V81_Uebergabe_E-Sources.md`) plus:
   - Rad Desk | Notizen in der Kopfzeile: Scrollen mit Maus und Trackpad (Raste angenehm? 40 px), Klick, Umschalt+Klick, Ziehen, Pfeile; Umschalten nach 0,3 s; Nachbarn halb sichtbar; Walzen drehen; schmale Kopfleiste (nur Symbol); VoiceOver („Schieberegler, Desk, 1 von 2“).
   - Touch (iPad/Telefon, sobald Notizen dort wieder an): Wischen hoch/runter am Rad.
   - Knopf „Notizen & Aufgaben“: Symbol aussagekräftig? Alt/⌥+N auf dem Mac (⌥N erzeugt sonst „~“-Tottaste – wird abgefangen, bitte prüfen). Rad „Pads“: Verteilt · Im Dock · Ausgeblendet, „Gemischt“ (ein Pad per ⋮ ins Dock legen), gesperrt ohne Pads und im Notizen-Modus.
   - Menü per Tastatur: Pfeile laufen über die Einträge, Tab erreicht die Räder und Regler.
   - Räder nach der Nachbesserung: Drehgefühl (Band, Einrasten, Wölbung), Tempo nach Klick/Pfeil (0,4–0,7 s im Test – zu träge?), Breite der Walzen und Abstände, Überschrift-Rad mit Walzen im Pad, View nur mit Symbolen, Cockpit-Rad links (alle drei Ansichten), Darstellung und Akzentfarbe im Dialog „Design anpassen“ (ringsum, eigene Farbe = Zwischenlage), Tour „Cockpit“ und „Start“ (Ziele View und Ansichten).

## Kleine Punkte (neu in V83)

- Desk | Notizen umschalten zeigt weiter die Meldung unten („Desk Mode: Portale und Slots.“) – nicht am Ort (F-214, „#perfekte Fokussierung“). Evtl. am Rad zeigen oder nur ansagen (das Rad zeigt den Zustand ja selbst).
- Ungenutzte Texte nach dem Umbau: `PAD_TEXT.newPad`, `newPadLabel`, `hide`, `show`, `shown`; `DOCK_TEXT.allIn`, `allOut`, `allOutHint`, `on`, `off`, `toDockHint`, `offHint` – prüfen, ob noch anderswo gebraucht, sonst entfernen.
- Rad im Menü: Räder sind `li role="none"` mit Slider – die Pfeiltasten des Menüs springen nicht auf sie (wie bei den Deckkraft-Reglern); erreichbar mit Tab.
- Portfolio „Aktuelles“ (DE/EN): Umschalt-Rad und Knopf „Notizen & Aufgaben“ nachziehen, sobald die Suche steht (ein Schritt zusammen).
- Im Testbrowser: Rad über `getByRole('slider', { name: 'Arbeitsweise dieses Desks' })` bzw. `{ name: 'Pads', exact: true }`; Menü über `.tb-nt`.

## Commit-Text V83

**Summary:** `V83: Umschalt-Rad (F-216) an Desk | Notizen, View, Cockpit, Design; Knopf „Notizen & Aufgaben“`

**Description:**
```
- Neues Bauteil Umschalt-Rad (ModeWheel.tsx, Logik modeWheel.ts mit
  Tests): Walzen wie das Daumenrad der MX Master, Scrollen/Wischen/
  Klick/Pfeiltasten, schaltet 0,3 s nach der letzten Raste, Nachbarn
  halb sichtbar, Schieberegler für Bildschirmleser
- Rad gebaut wie das Überschrift-Rad (Scrollband mit Einrasten und
  Wölbung), Knopf wie „Überschrift H1“, Mulde mit breiten Walzen
- Räder für Desk | Notizen, View (nur Symbole), Cockpit Portale ·
  Layouts · Library, Darstellung und Akzentfarbe; Überschrift-Rad mit
  denselben Walzen; „Sources“ im Cockpit heißt jetzt „Library“
- Knopf „Notizen & Aufgaben“ ersetzt NewPad: Neues Pad, Notiz suchen,
  Rad „Pads“ (Verteilt · Im Dock · Ausgeblendet, Gemischt dazwischen),
  Desk | Notizen, Deckkraft, Hilfe; Alt/⌥+N öffnet das Menü
- Hilfe „Umschalt-Rad“ und „Notizen & Aufgaben“, Symbole notesTasks
  und hide
- Lastenheft F-206 Schritt 5 und F-216 fortgeschrieben, Übergabe V83
- Tests 410 grün
```
