# Übergabe V82 → V83 E-Sources

Stand: 25.11.2026 · Chat V82 · Nächster Chat: **V83 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V83 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 „Schritt 5 – Knopf „Notes & Tasks“ + Cockpit (V82 …)“**, **F-216 Umschalt-Rad**, **F-217** und **NF-08**. Entscheidungen im Claude Doc „F-206 V82 – Knopf „Notes & Tasks“ und Cockpit (Schritt 5)“ (https://claude.ai/artifact/D4cigdE9w3Enmr94CFFwoU, PDF `docs/Arbeitspakete/F-206_V82_NotesTasks_Cockpit.pdf`). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_`–`V81_Uebergabe_E-Sources.md` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Arbeitsweise (Enrico)

- **Neu V82 – Leitsatz „weitestgehend gleicher Aufbau“ (NF-08):** Jede Ansicht, jedes Menü, jede Einstellung bietet dieselben Funktionen an derselben Stelle mit denselben Tasten; nur was wirklich anders ist, weicht leicht ab. Ziel: „prozessual bedingten Stress“ beseitigen. Gilt für alles Neue und Umgebaute.
- **Neu V82 – Umschalt-Rad (F-216):** Alle Knöpfe, die zwischen Modi umschalten, werden ein einheitliches Rad (Daumenrad der MX Master: geriffelte Metallwalzen links/rechts, Name in der Mitte, dreht hoch/runter). Weitere Umschalter selbst finden.
- Erst alle Funktionen, getestet wird erst, wenn alles steht – Prüfliste sammeln, nicht nach jedem Schritt fragen.
- Anzeige „Notiz“/„Notizen“, nie „Note“ (Code bleibt `Note`).
- Entscheidungs-Docs legt Claude selbst als PDF in `docs/Arbeitspakete/` ab, Dashboards in `docs/Dashboards/` (beide gitignore).
- Meldungen am Ort, 2 Sekunden (`NOTICE_MS`).
- Steuerknopf nur bei Notizen im Pad, nichts daran ausbauen (K5 zurückgestellt).

## Was in V82 passiert ist

- Kein Code geändert. Tests unverändert **402 grün** (Stand V81).
- Entscheidungs-Doc Schritt 5 angelegt und über Kommentare mit Enrico durchgearbeitet; alle Fragen beantwortet (N1–N13, U1–U7). Ergebnis im Lastenheft: F-206 Schritt 5, **F-216** Umschalt-Rad, **F-217** Touren prüfen, **NF-08** Leitsatz, Reihenfolge Punkte 31/32.
- Kernpunkte:
  - Knopf **„Notizen & Aufgaben“** mit aussagekräftigem Symbol (schmal nur Symbol) an der Stelle von NewPad; NewSlot und dieser Knopf bleiben zwei einzelne Knöpfe; Menü; **Alt/⌥+N**.
  - Menü: Neues Pad · Platz wählen … (gesperrt bis F-210) · Notiz suchen … · **Rad „Pads“: Verteilt · Im Dock · Ausgeblendet** (ersetzt vier Einträge; gemischt = „Gemischt“ zwischen den Rasten) · Desk | Notizen · Im Cockpit ordnen … · Deckkraft Pads/Dock · Hilfe. Sheet-Arten kommen jeweils mit ihrem Bau dazu.
  - **Suche (beides):** beste Treffer oben egal welcher Art, Art-Kennung (Symbol + farbige Kante + Wort), Chip-Zeile Alle · Portale · Sources · Notizen · Funktionen mit Zahl; „Notiz suchen …“ öffnet mit Chip „Notizen“.
  - **Cockpit:** Rad **Portale · Notizen · Layouts · Library** (Ansicht „Sources“ heißt künftig „Library“). Ansicht „Notizen“ = C2: Liste der Pads je Desk + Pads als Rahmen / Dock als Streifen im Radar; **weitestgehend wie „Portale“** (Zeigen, Verschieben nach … / Holen, Umbenennen, Schließen mit Rückgängig, Als Datei speichern, Filter, Tour), dazu nur Ins Dock / Aus dem Dock lösen, Deckkraft. Pads zwischen Desks verschieben (landet schwebend über dem aktiven Slot).
  - **Rad-Bedienung:** dreht hoch/runter; Hover + Scrollen hoch/runter (Seite scrollt dann nicht), Klick = nächster, Umschalt+Klick = voriger, Wischen hoch/runter, Pfeil hoch/runter (links/rechts ebenso), Pos1/Ende; Bildschirmleser = Schieberegler mit Wert; schaltet 0,3 s nach der letzten Raste; Anschlag bei 2–5 Modi, ringsum bei Darstellung/Akzentfarbe; Nachbarn halb sichtbar; eine Höhe wie Kopfleisten-Knöpfe, schmal nur Symbol + Walzen. Beim Testen nachjustieren.
  - Layout für Notes & Tasks: später mit dem Board.
- Dashboard **V82** als PDF unter `docs/Dashboards/E-Sources_Dashboard_V82.pdf`.
- Portfolio: „Aktuelles“ (DE/EN) nachgezogen – Pads, Dock, Erinnerungen, Sprachnotiz, Bild, Teilen; nächste Schritte und Leitsatz „weitestgehend gleicher Aufbau“.

## Nächste Schritte

1. **Umschalt-Rad als Bauteil** (z. B. `components/ModeWheel.tsx`, Logik in `workspace/modeWheel.ts` mit Test: Raste nach Scroll-Weg, Anschlag/ringsum, Verzögerung 0,3 s) – Design nach dem Überschrift-Rad (`nedit__hwheel` in `NoteEditor.tsx`) plus Metallwalzen; **als Erstes Desk | Notizen** in der Kopfzeile (`.tb-mode` in `App.tsx`, Texte `DESK_MODE_TEXT`).
2. Knopf **„Notizen & Aufgaben“** statt NewPad (App.tsx um Zeile 3022, `PAD_TEXT`): Symbol, Menü nach N4 mit Rad „Pads“, Alt/⌥+N, Hilfe-Eintrag mit Symbol (`HELP_ICON`).
3. **Suche** (`components/Search.tsx`, Liste `items` um Zeile 90): gemeinsame Passung über alle Arten, Art-Kennung, Chip-Zeile, Filter „Notizen“ – mit Test.
4. **Cockpit** (`components/Overview.tsx`, Modi um Zeile 229): Rad Portale · Notizen · Layouts · Library, Ansicht „Notizen“ wie „Portale“, Pads im Radar, Verschieben zwischen Desks (Logik in `pads.ts` mit Test).
5. Übrige Räder: View, Regeln | Radar, Darstellung, Akzentfarbe, Rest der Liste (F-216).
6. Danach (N13): F6 reihum → To-do, Kanban, Eisenhower → Lageplan F-210 → Notiz ↔ Quelle → Personen + Projektfokus → Board → **Touren prüfen (F-217)**.
7. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V81 (siehe `V81_Uebergabe_E-Sources.md`) plus die neuen Teile aus 1–5.

## Kleine Punkte (neu in V82)

- „Sources“ im Cockpit heißt künftig „Library“ – auch Texte, Hilfe, Tour „Verhalten von Sources“ und Suche anpassen.
- Sheet-Arten im Menü „Neues Pad“ ohne Platzhalter – jede kommt mit ihrem Bau dazu.
- Touren (alle 8) nach dem Notizen-Bereich prüfen (F-217) – nicht vorher anfassen.

## Commit-Text V82

**Summary:** `V82: Entscheidungen F-206 Schritt 5, Umschalt-Rad (F-216), Leitsatz NF-08, Übergabe V82`

**Description:**
```
- Lastenheft F-206 Schritt 5: Knopf „Notizen & Aufgaben“ mit Rad
  „Pads“, neue Suche (beste Treffer oben, Art-Kennung, Chips),
  Cockpit Portale · Notizen · Layouts · Library, Ansicht „Notizen“
  weitestgehend wie „Portale“ (Antworten N1–N13)
- F-216 Umschalt-Rad für alle Umschalter (Antworten U1–U7)
- F-217 Touren nach dem Notizen-Bereich prüfen
- NF-08 Leitsatz „weitestgehend gleicher Aufbau“
- Reihenfolge nach Schritt 5: F6, To-do/Kanban/Eisenhower, F-210
- Übergabe V82 (kein Code geändert, Tests 402 grün)
```
