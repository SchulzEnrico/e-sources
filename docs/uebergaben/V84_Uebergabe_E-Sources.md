# Übergabe V84 → V85 E-Sources

Stand: 25.11.2026 · Chat V84 abgeschlossen · Nächster Chat: **V85 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V85 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 „Schritt 5“** (mit „Gebaut V83“ und „Gebaut V84“), **F-216** (mit „Gebaut V84“), **F-217** und **NF-08**. Entscheidungen im Claude Doc „F-206 V82 – Knopf „Notes & Tasks“ und Cockpit (Schritt 5)“ (https://claude.ai/artifact/D4cigdE9w3Enmr94CFFwoU, PDF `docs/Arbeitspakete/F-206_V82_NotesTasks_Cockpit.pdf`). Arbeitsweise und Kernpunkte von Schritt 5 stehen in `V82_Uebergabe_E-Sources.md`, das Umschalt-Rad in `V83_Uebergabe_E-Sources.md`. Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_`–`V83_Uebergabe_E-Sources.md` gelten weiter. Metall-Vorlagen von Enrico liegen in `docs/Arbeitspakete/Vorlagen/` (lokal, gitignore). Dann „Nächste Schritte“ ab 1.

## Was in V84 passiert ist

Tests **414 grün** (V83: 410; neu 4 Suche/Passung). `npx tsc --noEmit -p .` sauber. Im eingebauten Browser angesehen (`?test=voll`, 1600 × 900): Chrom-Mitte, Zahnrad-Menü mit Rädern, Cockpit Radar | Regeln (Pfeil schaltet auf Regeln), Suche mit Chips, Art-Kennung und „Notiz suchen …“.

1. **Rückmeldung Enrico zum Rad:** Name schon ab 1100 px ausblenden – bleibt erstmal; Tempo nach Klick/Pfeil (0,4–0,7 s) fühlt sich gut an. **Mitte „nicht metallisch genug“** → jetzt poliertes Chrom nach Enricos Vorlagen (Bilder in `docs/Arbeitspakete/Vorlagen/`): heller Lichtstreifen oben, waagerechte Glanzbänder, dunkle Fuge mit Chromrand (`box-shadow`-Ringe), feine Bürstung, weiße Schrift mit Schatten. Gilt auch fürs Überschrift-Rad im Pad (NF-08). Block „V84 (Enrico: „Mitte nicht metallisch genug“…)“ am Ende von `App.css`. Dritte Vorlage (Glasknöpfe schwarz/weiß mit Chromrahmen und Glanzpunkt oben rechts) nur gemerkt, noch nicht verwendet.
2. **Übrige Räder (F-216 U6) – ✓ gebaut:**
   - Cockpit **Radar | Regeln** (`Overview.tsx`, Klasse `overview__rules` bleibt – Tour-Ziel passt): nur in der Ansicht „Portale“, an der Stelle des alten Knopfs. Text `RULES_TEXT.wheel` = „Radar oder Regeln“. `rulesBtn` entfernt.
   - Cockpit Layouts-Vorschau **Gerät · Ausrichtung · Reihen** (`DeskLayouts.tsx`, Klasse `lc__wheel`): Gerät mit Anschlag (7 Geräte der Größe nach), echtes Gerät mit „· dieses Gerät“.
   - Zahnrad-Menü (`App.tsx`): **Bildschirm** (NF-08, wie Gerät), **Verdecktes pausieren**, **Sichtbares pausieren**, **Ausrichtung**, **Reihen** als Räder in `menu__wheel`-Zeilen (Beschriftung links). Neues Prop `id` am `ModeWheel` – `#set-pause` (Sprung aus dem Pause-Menü) zeigt jetzt aufs Rad. Suchmaschine bleibt Auswahlliste (Inhalt, kein Modus).
   - Library **Dieses Portal | Alle** (`Bookmarks.tsx`, Klasse `bm-scope`; „Panel“ heißt jetzt „Portal“).
   - Sprachnotiz **In diese Notiz | Neue Notiz** (`PadFooter.tsx`, Rad mit Klasse `padvoice__target`; alter Gruppen-Rahmen per CSS neutralisiert).
   - Profil **Begrüßung**: Art (Standard · Regional · Zitat · Zufall · Eigene), Form des Zitats, Wechsel (täglich/bei jedem Öffnen) als Räder (`welcome__wheel`). Gruß- und Zitat-Auswahl bleiben Listen; Profilfarbe bleibt Farbfeld (wie Kategorie-Zeichen kein Rad).
3. **Suche (F-206 N6) – ✓ gebaut:**
   - `workspace/searchRank.ts` (reine Funktionen, Test): `fitOf` (Titel genau 100 … Beiwerk 20/30 … sonst 5, ohne Akzente), `rankHits` (stabil, Fragen +60 bei „wie …“), `chipOf`, `chipCounts`, `byChip`, `chipStep` (ringsum, leere Chips übersprungen).
   - `components/Search.tsx`: eine Liste ohne Gruppen-Überschriften, beste Treffer oben; `renderItem` je Art; Art-Kennung = Symbol im Titel + farbige Kante (`search__hit--portal` …) + Wort rechts oben (`search__kind`, Texte `SEARCH_TEXT.kind`); Chip-Zeile oben (sticky, `aria-hidden`, Fokus bleibt im Feld) – Tastatur **Strg/⌃+←/→** im Feld, Ansage über `role=status` („Filter Portale. 50 Treffer: …“); „Im Web suchen“ immer unten mit Trennlinie; leerer Chip zeigt „Nichts unter „Notizen“ – 50 Treffer unter „Alle““.
   - Empfänger für `esource:find` (`kind: 'notes'` → Chip „Notizen“, Platzhalter „Notizen durchsuchen …“); Auswahl eines Treffers oder Leeren des Felds setzt den Chip zurück auf „Alle“.
4. Lastenheft: F-206 Schritt 5 („Gebaut V84 (N6)“) und F-216 („Gebaut V84“, Reihenfolge Punkt 31) nachgezogen.

## Nächste Schritte

1. **Cockpit „Notizen“** (`components/Overview.tsx`, Modi um Zeile 229): Rad Portale · Notizen · Layouts · Library; Ansicht „Notizen“ weitestgehend wie „Portale“ (Radar mit Pads als Rahmen und Dock als Streifen, darunter Pad → Sheets mit denselben Werkzeugen), Pads zwischen Desks verschieben (Logik in `pads.ts` mit Test). Dann „Im Cockpit ordnen …“ im Menü „Notizen & Aufgaben“ freischalten. Radar | Regeln dann auch in „Notizen“ zeigen?
2. Danach (N13): F6 reihum → To-do, Kanban, Eisenhower → Lageplan F-210 → Notiz ↔ Quelle → Personen + Projektfokus → Board → **Touren prüfen (F-217)**.
3. Portfolio „Aktuelles“ (DE/EN): Umschalt-Rad, Knopf „Notizen & Aufgaben“ und neue Suche nachziehen (jetzt fällig, Kleiner Punkt V83).
4. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V83 (siehe `V81_` und `V83_Uebergabe_E-Sources.md`) plus:
   - Chrom-Mitte der Räder (Kopfleiste, Menüs, Cockpit, Design, Pad-Überschrift) in hellen und dunklen Darstellungen – Schrift gut lesbar?
   - Zahnrad-Menü: Räder Bildschirm, Verdecktes/Sichtbares pausieren, Ausrichtung, Reihen; Sprung „Pausieren nach …“ aus dem Pause-Menü landet auf dem Rad.
   - Cockpit: Rad Radar | Regeln (nur bei „Portale“); Layouts: Gerät · Ausrichtung · Reihen.
   - Library-Dialog Dieses Portal | Alle; Sprachnotiz-Ziel; Profil → Begrüßung.
   - Suche: Reihenfolge sinnvoll (z. B. „notiz“, „hamburg“, „wie …“)? Chips mit Zahl, **Strg/⌃+←/→ auf dem Mac** (⌃+Pfeil ist in macOS ab Werk „Space wechseln“ – kommt die Taste in der App an? Sonst andere Taste wählen), Art-Wort und Farbkante, „Notiz suchen …“ (Alt/⌥+N → Notiz suchen), VoiceOver-Ansage.

## Kleine Punkte (neu in V84)

- Strg/⌃+←/→ für die Chips kollidiert auf dem Mac evtl. mit Mission Control (Spaces wechseln) – beim Testen klären; Ersatz wäre z. B. Alt/⌥+Zahl.
- Chip-Zeile ist `aria-hidden` (nur Maus); Bildschirmleser nutzen Strg+Pfeil und hören die Ansage – im Hilfetext des Felds erklärt.
- Hilfe „Suche“ (HELP) und Tour „Start“ erwähnen die Chips noch nicht → mit F-217.
- Dritte Metall-Vorlage (Glasknöpfe mit Chromrahmen) ist nur gemerkt – evtl. für Knöpfe allgemein (Design „Retro“?) später.
- Profilfarbe bleibt Farbfeld; Suchmaschine, Gruß und Zitat bleiben Auswahllisten – bei Bedarf mit Enrico klären.

## Commit-Text V84

**Summary:** `V84: Räder überall (F-216), Chrom-Mitte, Suche über alle Arten mit Chips (F-206 N6)`

**Description:**
```
- Umschalt-Rad mit Mitte aus poliertem Chrom (Vorlagen Enrico), auch
  im Überschrift-Rad des Pads
- Räder für Cockpit Radar | Regeln, Layouts-Vorschau Gerät ·
  Ausrichtung · Reihen, Zahnrad-Menü Bildschirm · Pausieren ·
  Ausrichtung · Reihen, Library Dieses Portal | Alle, Sprachnotiz-Ziel
  und Profil-Begrüßung; Prop id am Rad
- Suche: gemeinsame Passung über alle Arten (searchRank.ts mit Tests),
  beste Treffer oben, Art-Kennung (Symbol, farbige Kante, Wort),
  Chips Alle · Portale · Library · Notizen · Funktionen mit Zahl
  (Strg/⌃+←/→), Im Web suchen immer unten
- „Notiz suchen …“ öffnet die Suche mit Chip „Notizen“
- Lastenheft F-206 Schritt 5 und F-216 fortgeschrieben, Übergabe V84
- Tests 414 grün
```
