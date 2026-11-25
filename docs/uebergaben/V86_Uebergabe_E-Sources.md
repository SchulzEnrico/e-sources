# Übergabe V86 → V87 E-Sources

Stand: 25.11.2026 · Chat V86 abgeschlossen · Nächster Chat: **V87 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V87 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 „Schritt 7 – To-do, Kanban, Eisenhower (V86 …)“** (mit „Gebaut V86“) und **NF-08**. Die Entscheidungen stehen im Claude Doc „F-206 V86 – To-do, Kanban, Eisenhower (Schritt 7)“ (https://claude.ai/artifact/15T1ph3vYnPc6XqofiEBJH, PDF `docs/Arbeitspakete/F-206_V86_ToDo_Kanban_Eisenhower.pdf`). **Leitlinie Enrico: an Trello und unserer UX/UI ausrichten.** Eisenhower nach Enricos Report (Abb. 17, Bild im Chat V86): senkrecht Wichtigkeit (oben sehr), waagerecht Dringlichkeit (rechts sehr); oben links planen, oben rechts erledigen, unten rechts delegieren, unten links ablegen mit Mülleimer in der Ecke. Schritt-5-Stand in `V85_Uebergabe_E-Sources.md`, Umschalt-Rad in `V83_…`, Arbeitsregeln und Technik weiter `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`); offene kleine Punkte aus `V74_`–`V85_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V86 passiert ist

Tests **424 grün** (V85: 416; neu 8 in „F-206 Schritt 7“). `npx tsc --noEmit -p .` sauber. Im eingebauten Browser kurz geprüft (`localhost:2910/?test=voll`): To-do anlegen, abhaken mit Rückgängig, F2 umbenennen, Kartenfenster öffnen/Esc – keine Fehler.

1. **Entscheidungs-Doc Schritt 7** mit Enrico (Kommentare): S1 und T1 „wie Trello“ (Weg D), K2 = A plus Trello-Ausrichtung (Spalten wie Trello-Listen, Erledigt-Kreis auf der Karte, WIP-Zähler wie „List Limits“), E1 nach Report Abb. 17 mit Mülleimer in „ablegen“ (statt „Verwerfen“), alle übrigen Fragen „Wie Vorschlag“. Antworten im Doc eingetragen, PDF abgelegt, Lastenheft F-206 „Schritt 7“ neu.
2. **Logik `workspace/sheets.ts`** (mit Tests) – siehe Lastenheft „Gebaut V86“. Datenmodell: `NoteColumn.state` (`ColState` offen/in Arbeit/in Prüfung/erledigt; fehlt bei alten Boards → aus dem Namen geraten). `noteState` zieht jetzt Kanbans nach (`syncBoards`).
3. **Oberfläche `components/SheetViews.tsx`:** `SheetHead` (Filter + Rad „Offen · Alle“, weitere Räder als Kinder), `CardWindow` (Kartenfenster wie Trello, abgedunkelt, Tab bleibt drin, Esc/✕/Klick daneben; Checkliste mit „In Aufgabe umwandeln“ – nur ohne Entwurf), `useNotice`/`NoticeLine` (2 s am Ort), `Signs` (Zeichen als Text-Pillen, nie Farbe allein), **`TodoSheet`**. Eingebunden in `Pad.tsx` (Zweig `sheet.kind === 'todo'`); Fußleiste: `isSheetUi` (Home, Neue Aufgabe, Suche auch im To-do). Texte `SHEET_TEXT`, Symbole `lock`, `tick`, `chevronDown`, `chevronRight`. CSS am Ende von `App.css` (Block „F-206 Schritt 7 (V86)“).

## Nächste Schritte

1. **Kanban-Oberfläche** (K1–K5, L2) in `SheetViews.tsx`: Spalten wie Trello-Listen nebeneinander (waagerecht scrollbar), Kopf mit Name/Zeichen der Bedeutung/Zähler „3 / 4“/⋮ (Karte hinzufügen · Spalte verschieben · Alle Karten verschieben … · Sortieren nach … · WIP-Limit … · Bedeutung … · Löschen mit Rückgängig), „+ Karte hinzufügen“ unten je Spalte, „+ Spalte“ rechts (bis 8), Karten im Clay-Stil mit `Signs`, Erledigt-Kreis (Hover/Fokus), die nächsten drei offenen Unter-Notizen blasser darunter; Ziehen mit Maus/Touch (lange drücken), Tastatur Leertaste aufnehmen/Pfeile/ablegen/Esc; WIP-Rückfrage (K3); Abnahme: „Abnahme bestätigen“ (`reviewOk`) mit Rückfrage. Aktionen sind schon da (`cardMove`, `col*`).
2. **Eisenhower-Oberfläche** (E1–E4) nach Abb. 17 mit Mülleimer (löschen über `noteDelete` + Rückgängig nach V62-Regeln), Streifen „Noch nicht eingeordnet“, Feld-Knöpfe Termin …/Delegieren an …/Archivieren, Tastatur (Pfeile zwischen Feldern, Leertaste aufnehmen). Aktion `quadSet` ist da.
3. **Menü G** („Notizen & Aufgaben“: Neue To-do-Liste · Neues Kanban-Board · Eisenhower-Matrix – Matrix öffnet `theMatrix`), Hilfe-Einträge (To-do, Kanban, Eisenhower, Kartenfenster; je Symbol in `HELP_ICON`), Wischen → heißt „Neue Checkliste“ (Text `FOOT_TEXT.make.right`).
4. Danach (N13): Lageplan F-210 → Notiz ↔ Quelle (Schritt 6) → Personen + Projektfokus (8) → Board (9) → Touren prüfen (F-217). Portfolio „Aktuelles“ nachziehen (seit V83).
5. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V85 (siehe `V81_`, `V83_`, `V84_`, `V85_Uebergabe_E-Sources.md`) plus:
   - To-do-Liste: „+ Sheet › To-do-Liste“; Neue Aufgabe (Enter, Feld bleibt), Haken, „erledigt · Rückgängig“, „n erledigt“ aufklappen, Rad Ordnung (Eigene · Fällig · Wichtig) und Zeigen (Offen · Alle), Filter, F2, Alt+Pfeil, Entf (aus dem Sheet, Rückgängig), Unter-Notizen eingerückt.
   - Kartenfenster: Enter/Klick öffnet, Esc/✕/Klick daneben schließt, Fokus zurück; Checkliste „In Aufgabe umwandeln“; schmales Pad (< 640 px) füllt das Pad.
   - Schloss: Notiz auf einem Kanban und zugleich im To-do → Schloss, „Zum Kanban“ (erst prüfbar mit Kanban-Oberfläche).
   - Fußleiste im To-do: Home, Neue Aufgabe, Suche.

## Kleine Punkte (neu in V86)

- Rad „Ordnung“ und „Zeigen“ merken sich ihre Wahl noch nicht (nur bis zum Schließen des Pads) – bei Bedarf je Sheet und Gerät speichern.
- Erledigte springen sofort in „n erledigt“ (Entscheidung T2 sagte „nach 2 s“); „Rückgängig“ am Ort holt sie zurück. Bei Bedarf Verzögerung einbauen.
- Schloss gilt bisher nur im To-do-Sheet; Notizblock-Liste und Zustand-Auswahl im Editor setzen den Zustand weiter frei (L1 „überall“ nachziehen).
- „V“ (Verschieben nach …) in Sheets fehlt noch (wie im Cockpit, Ziel-Sheet wählen).
- `TodoSheet` „Neue Aufgabe“ aus dem Halbkreis fokussiert nur das Feld.
- Tests in Claudes VM weiter nur mit `vitest-ersatz.js` (siehe V61).

## Commit-Text V86

**Summary:** `V86: F-206 Schritt 7 – Logik für To-do/Kanban/Eisenhower, To-do-Liste im Pad, Kartenfenster wie Trello`

**Description:**
```
- Entscheidungs-Doc Schritt 7 (an Trello und unserer UX/UI ausgerichtet,
  Eisenhower nach Report Abb. 17 mit Mülleimer), Lastenheft F-206
- sheets.ts (mit Tests): Spalte ↔ Zustand, Schloss, To-do-Zeilen und
  Ordnung, Checkliste → Aufgabe, Eisenhower-Matrix
- NoteColumn.state; Zustand der Notiz zieht Kanbans nach
- SheetViews.tsx: Kopfzeile mit Filter und Rädern, Kartenfenster,
  To-do-Liste mit Tastatur, Schloss und Meldungen am Ort
- Fußleiste auch im To-do; Symbole lock, tick, chevron
- Übergabe V86, Tests 424 grün
```
