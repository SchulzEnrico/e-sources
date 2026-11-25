# Übergabe V85 → V86 E-Sources

Stand: 25.11.2026 · Chat V85 abgeschlossen · Nächster Chat: **V86 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V86 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 „Schritt 5“** (mit „Gebaut V83“, „Gebaut V84“, „Gebaut V85“ und „Gebaut V85 (N13 – F6 reihum)“), **F-216** (mit „V85“), **F-217** und **NF-08**. Für Schritt 7 (To-do, Kanban, Eisenhower) die Entscheidungen im Claude Doc „E-Sources – Notizen und Ansichten“ (https://claude.ai/artifact/NAbnAYie4DdKRkM5hKWXJa, PDF in `docs/Arbeitspakete/`) und im Datenmodell (F-206 „Datenmodell (V65)“). Arbeitsweise und Kernpunkte von Schritt 5 stehen in `V82_Uebergabe_E-Sources.md`, das Umschalt-Rad in `V83_Uebergabe_E-Sources.md`. Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_`–`V84_Uebergabe_E-Sources.md` gelten weiter. Metall-Vorlagen in `docs/Arbeitspakete/Vorlagen/` (LIESMICH.md). Dann „Nächste Schritte“ ab 1.

## Was in V85 passiert ist

Tests **416 grün** (V84: 414; neu: Cockpit „Notizen“ – Pad auf Desk, Schließen/Sheet rückgängig; F6 reihum). `npx tsc --noEmit -p .` sauber. Im eingebauten Browser geprüft (`localhost:2910/?test=voll`, 1600 × 900).

1. **Rad-Mitte (F-216) – mit Enrico live nachjustiert:** Ergebnis: Metall gedämpft zu **Gunmetal** (Lichtstreifen oben angedeutet, Chromrand dunkler `#8e949a`/`#3e4247`), Schrift und Symbole **erhaben geprägt** (`text-shadow: -1px -1px 0 rgba(255,255,255,.4), 1px 1px 0 rgba(0,0,0,.85), 1px 2px 1px rgba(0,0,0,.35)`, Symbole per `drop-shadow`) in **Metallfarbe `#c2c8ce`**; kein Schatten-Feld hinter der Schrift. **Walzen** mit 1 px Ecken (statt 3 px) und schwächerer Abschattung. Verworfen (nicht wieder vorschlagen): Schwarzchrom, schwarzes Feld oder weicher Schatten hinter der Schrift, Verlauf in der Schrift (wirkte unscharf), reinweiße Schrift. CSS: Block „V84 (Enrico: „Mitte nicht metallisch genug“ …“ und folgende V85-Kommentare in `App.css`.
2. **Cockpit „Notizen“ (F-206 N8–N10) – ✓ gebaut:** Rad Portale · **Notizen** · Layouts · Library. `components/NotesCockpit.tsx` (Texte `NOTES_COCKPIT_TEXT`, CSS `.ncp…` am Ende von `App.css`): Radar je Desk – Slots blass gestrichelt, Pads als Rahmen (Kante oben 4 px, gleiche Plätze leicht versetzt, ohne Platz gestrichelt), Dock als gerieftes Streifen rechts; Liste Pad → Sheets mit Verschieben nach … (V), Hierher holen (H), Ins Dock/Lösen (D), Schließen (Entf) mit „Rückgängig“ am Ort (2 s), Umbenennen (F2), Zeigen (Klick/Enter, auch auf anderem Desk, Dock wird gezeigt/ausgeklappt, Fokus ins Pad); Filterfeld oben (geteilt mit „Portale“, `notesFirst`-Ref für Pfeil runter), Deckkraft Pads/Dock unter der Liste. Logik in `pads.ts` (Test): `movePadToDesk`, `padUndoOf`/`restorePad`, `sheetUndoOf`/`restoreSheet`, `padTitle`. Aktionen `padToDesk`, `padRestore`, `padRestoreSheet`. App: `showPad`, `padToDesk` (hierher über `padHome()`), `openNotesCockpit`, State `overviewNotes` (Fokus-Knopf setzt ihn zurück). **„Im Cockpit ordnen …“** im Menü „Notizen & Aufgaben“ freigeschaltet. Radar | Regeln und Slotmaschine nur bei „Portale“.
3. **F6 reihum (N13 Teil 1, P7/D11) – ✓ gebaut:** `workspace/focusRing.ts` (`ringSort`, `ringStep`; Test), `components/useF6.ts`: Kopfleiste → Slots (`section.win[data-panel-id]`, Lese-Reihenfolge) → Dock (`aside.dock`) → Pads (`section.pad:not(.pad--docked)`, oberstes zuerst); Umschalt+F6 rückwärts; merkt je Bereich den letzten Fokus; erstes Ziel = gewählter Tab, nie ein Schließen-Knopf; Ansage „Bereich i von n: …“ (`F6_TEXT`); aus bei offenem Cockpit (`#overview`) und modalen Dialogen. Hilfe „Bereiche reihum (F6)“ (Symbol `f6Ring`).
4. Hilfe „Notizen & Aufgaben“ um „Im Cockpit ordnen …“ ergänzt. Lastenheft F-206 (Schritt 5, Schritt 4 F6-Vermerk) und F-216 nachgezogen.

## Nächste Schritte

1. **Schritt 7 – To-do, Kanban, Eisenhower** (N13: vorgezogen, damit das Verhalten von Notizen testbar wird). Vorher prüfen, welche Fragen im Doc „Notizen und Ansichten“ (V61) und im Datenmodell (V65) schon entschieden sind; was offen ist (z. B. Aufbau der Sheets im Pad, Spalten/WIP-Limit-Bedienung, Abhaken gesperrt mit Schloss und Sprung zum Kanban, Eisenhower-Felder, Tastatur/Bildschirmleser, Rad-Einsatz nach NF-08) als **Claude Doc an der Seite** mit Spalte „Antwort Enrico“ anlegen und als PDF in `docs/Arbeitspakete/` ablegen – erst nach Antwort ins Lastenheft und bauen. Sheet-Arten kommen dann ins Menü „Notizen & Aufgaben“ (N5).
2. Danach (N13): Lageplan F-210 → Notiz ↔ Quelle (Schritt 6) → Personen + Projektfokus (8) → Board (9) → **Touren prüfen (F-217)** (inkl. Cockpit-Tour mit „Notizen“, Hilfe/Tour „Start“ mit Such-Chips und F6).
3. Portfolio „Aktuelles“ (DE/EN): Umschalt-Rad, Knopf „Notizen & Aufgaben“, neue Suche, Cockpit „Notizen“ nachziehen (Kleiner Punkt seit V83).
4. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V84 (siehe `V81_`, `V83_`, `V84_Uebergabe_E-Sources.md`) plus:
   - Rad-Mitte Gunmetal mit Prägung in hellen und dunklen Darstellungen (Kopfleiste, Menüs, Cockpit, Design, Pad-Überschrift) – lesbar? Walzen-Ecken.
   - Cockpit „Notizen“: über „Notizen & Aufgaben › Im Cockpit ordnen …“ und über das Rad; Pads als Rahmen, Dock-Streifen; V/H/D/Entf/F2, Rückgängig, Zeigen (auch auf Desk 2), Filter, Deckkraft; Esc zurück zu „Portale“.
   - F6/Umschalt+F6: Kopfleiste → Slots → **Dock** → Pads (Dock im Browser noch ungeprüft), Merken des letzten Fokus, VoiceOver-Ansage; auf dem Mac ggf. **fn+F6** nötig (F-Tasten als Medientasten).

## Kleine Punkte (neu in V85)

- Cockpit „Notizen“: Pads im Radar mit der Maus ziehen (auf anderen Desk bzw. an einen Platz) noch nicht – nur über V/H. „Als Datei speichern“ für Pads fehlt (kein Pad-Dateiformat). Bei Bedarf mit Enrico klären.
- Dock-Streifen im Radar: Breite für andere Desks aus der Breite dieses Fensters geschätzt.
- F6 ist am Mac ab Werk eine Medientaste – evtl. fn+F6; beim Testen klären (Ersatz z. B. Strg+F6 nicht nötig, solange fn geht).
- `OpacitySlider` rendert `<li>` – im Cockpit in `<ul class="ncp__opacity">` gesetzt; Hinweistexte der Regler sind lang (nehmen Platz) – bei Bedarf kürzen.
- Tests in Claudes VM weiter nur mit `vitest-ersatz.js` (siehe V61); vitest selbst scheitert am fehlenden rollup-Baustein für linux-arm64.

## Commit-Text V85

**Summary:** `V85: Cockpit „Notizen“ (F-206 N8–N10), F6 reihum, Rad-Mitte Gunmetal mit Prägung`

**Description:**
```
- Cockpit-Rad Portale · Notizen · Layouts · Library; Ansicht „Notizen“
  (NotesCockpit.tsx): Pads als Rahmen und Dock als Streifen je Desk,
  Liste Pad → Sheets mit Verschieben (V), Holen (H), Dock (D),
  Schließen mit Rückgängig (Entf), Umbenennen (F2), Zeigen, Filter,
  Deckkraft
- pads.ts: movePadToDesk, padUndoOf/restorePad, sheetUndoOf/
  restoreSheet, padTitle (mit Tests); Aktionen padToDesk, padRestore,
  padRestoreSheet
- „Im Cockpit ordnen …“ im Menü „Notizen & Aufgaben“ freigeschaltet
- F6 / Umschalt+F6 reihum: Kopfleiste → Slots → Dock → Pads, merkt den
  letzten Fokus, Ansage (focusRing.ts mit Test, useF6.ts), Hilfe
- Umschalt-Rad: Mitte Gunmetal, Schrift und Symbole geprägt in
  Metallfarbe, Walzen fast eckig
- Lastenheft F-206/F-216 fortgeschrieben, Übergabe V85
- Tests 416 grün
```
