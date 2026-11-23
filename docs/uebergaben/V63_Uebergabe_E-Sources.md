# Übergabe V63 → V64 E-Sources

Stand: 23.11.2026 · Chat V63 abgeschlossen · Nächster Chat: **V64 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V64 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md` (vor allem **F-206**). Für Technische Rahmenbedingungen, Arbeitsregeln und die lange Liste „Kleine Punkte“ gilt weiter `docs/uebergaben/V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`), dazu die kleinen Punkte aus `V62_Uebergabe_E-Sources.md`. Dann „Nächste Schritte“ ab 1.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` – F-206 jetzt „◐ V63“.
- **Entscheidungs-Doc F-206:** https://claude.ai/artifact/NAbnAYie4DdKRkM5hKWXJa · PDF in `docs/Arbeitspakete/` (nur lokal).
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – nachzuziehen: Gist-Abgleich (V58/V59), Slot als Datei (F-158), Farbpipette (F-147), Notizen (F-206: Notiz im Tab V62, direkt formatiert schreiben V63).
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Demo:** https://schulzenrico.github.io/e-sources/
- **Portfolio:** `~/Projects/SchulzEnrico.github.io` – „Aktuelles“ in V63 um Notizen ergänzt (DE/EN), **noch nicht committet** (Text unten).

## Was in V63 passiert ist

- Schritt 1 aus V62 war schon erledigt (Commit `d9d3f26`, gepusht).
- **Portfolio „Aktuelles“** (DE/EN): ein Satz zu Notizen im Tab (abhakbare Aufgaben, Zustand, Fälligkeit; Grundstein für To-do, Kanban, Eisenhower).
- **F-206 Eingabe – direkt formatiert schreiben** (Entscheidung Enrico, V62):
  - Neu `web/src/workspace/noteDoc.ts` (rein, getestet): Markdown ↔ Blöcke **je Zeile** (`parseDoc`/`serializeDoc`; leere Zeilen bleiben erhalten, Absatz-Text, der wie ein Zeichen aussähe, bekommt `\` davor, nummerierte Listen werden neu gezählt), Tipp-Kürzel (`shortcut`), Inline-Bausteine (`parseInline`/`inlineMd`/`plainOf`/`mergeSpans`, getippte `* \` [ ]` werden mit `\` geschützt), `taskCount` (für spätere Karten).
  - Neu `web/src/components/NoteEditor.tsx`: `contenteditable`, ein Element je Block mit `data-b` (p, h3–h5, blockquote, pre, li in ul/ol mit `data-g`; Aufgaben = li mit eigenem Kästchen `contenteditable=false`). Enter, Rückschritt/Entfernen an Blockgrenzen, Einfügen (nur `text/plain`), Ziehen (gesperrt) und Rückgängig/Wiederholen (eigener Verlauf, 100 Stände, Tippen nach 0,9 s Pause neuer Stand) macht der Editor selbst über natives `beforeinput` (geht auch mit Handy-Tastaturen); Zeichen tippt der Browser. Nach jeder Eingabe wird das DOM gelesen und fremde Strukturen bereinigt. Nie `innerHTML`, Links nur `http(s)`/`mailto`.
  - Leiste (`role=toolbar`, Pfeiltasten, ein Tab-Stopp, Knöpfe 40 px hoch): Aufgabe · Liste · Überschrift · fett; zeigt den Zustand an der Schreibmarke (`aria-pressed`). Kürzel: „- “, „* “, „1. “, „[] “, „[ ] “, „- [ ] “, „# “, „> “; Strg/⌘+Enter hakt eine Aufgabe ab (sonst wird die Zeile Aufgabe); Strg/⌘+B; Strg/⌘+Klick öffnet Links. Ansagen für Bildschirmleser (`role=status`).
  - Erste Zeile erscheint als Titel (CSS `.nedit > p:first-child`); das Titelfeld und der Wechsel Bearbeiten/Lesen sind weg (`Note.title` bleibt im Modell, wird aber nicht mehr angeboten). `titleOf` übergeht `\`-Schutz.
  - `NoteTab.tsx`: Markdown-Anzeige (`Markdown`, `inline`, `toggleTask`) entfernt, nutzt `NoteEditor`.
- **F-206 Löschen** (Entscheidung Enrico, V62): Knopf „Löschen“ in der Notiz-Leiste. Keine offenen Unter-Notizen → sofort, Hinweis mit „Rückgängig“ (10 s). Sonst Rückfrage (`alertdialog`, Esc = Abbrechen, Fokus auf ersten Knopf): Unter-Notizen behalten (rutschen hoch) · Alle mitlöschen · Lieber archivieren · Abbrechen.
  - `notes.ts`: `openDescendants`, `deleteNote(ws, id, { keepChildren })` (Kinder bekommen die Eltern der gelöschten Notiz), `NoteUndo.parents`, `restoreNotes` setzt die Eltern zurück.
  - Reducer: `noteDelete`, `noteRestore`.
- Texte in `terms.ts` (`NOTE_TEXT`: Leiste, Ansagen, Löschen/Rückfrage), Hilfe-Einträge `noteWrite`, `noteDelete` mit Fragen; Symbole `task`, `list`, `heading`, `bold`, `trash`.
- Tests: **333 grün** (vorher 327). Im eingebauten Browser (`?test=voll`) geprüft: Notiz anlegen (Fokus im Text), „[] “ → Aufgabe, Enter setzt fort, Enter in leerer Aufgabe beendet, ⌘+B fett, Kästchen abhaken (durchgestrichen), Rückschritt am Anfang einer Aufgabe → Text, ⌘+Z holt sie zurück, Tab weg/zurück zeichnet aus gespeichertem Markdown gleich, Enter mitten in Fettem teilt richtig, Leiste „Liste“ (gedrückt-Zustand), mehrzeiliges Einfügen mit `<b>` bleibt reiner Text, Löschen + „Rückgängig“.

## Nächste Schritte

1. **Commits** (Enrico, GitHub Desktop): Repo `e-sources` und Repo `SchulzEnrico.github.io` (Texte unten), jeweils PO.
2. **Enrico prüft das Schreiben** auf Mac (Safari/Chrome) und iPhone/iPad: Enter, Rückschritt, Leiste mit dem Finger, Diktat/Autokorrektur der Tastatur (Composition), Strg+B unter Windows. Rückmeldungen gern im Sammelmodus.
3. **F-206 Schritt 3 – Library und Suche für Notizen:** Notizen in der Library/Suche finden und in einem Tab öffnen; Notiz/Ansicht auch über Portal-Menü und Suche anlegen; beim Navigieren eine **leere** Notiz still verwerfen (siehe V62 kleine Punkte).
4. Danach weiter nach Bau-Reihenfolge F-206: To-do-Liste → Kanban-Board → Eisenhower-Matrix → Notizblock und Schnell erfassen → Unter-Notizen, Vorgänger, Spur (Oberfläche) → Anhängen, Weiterleiten, Delegieren, Sprachnotiz → Hilfe und Tour.
5. Kleine offene Punkte (Barrierefreiheit, bei Restplatz): siehe V61 Nr. 5 und unten.
6. Später: Entwicklerwerkzeuge (F-16/F-18/F-115), Stand auf allen Geräten zurücksetzen.
7. **Spaces und Cases sowie Slot als Datei (F-158)** prüft Enrico ganz am Ende (nicht vorher fragen).

## Kleine Punkte (neu in V63)

- Die Rückfrage beim Löschen (offene Unter-Notizen) ist nur per Test geprüft – es gibt noch keine Oberfläche für Unter-Notizen.
- Strg+B auf dem Mac macht nichts (dort ⌘+B) – im Hinweis steht „Strg/⌘+B“, passt.
- Unterstreichen, Durchstreichen, Farben sind gesperrt (`beforeinput`), Strg/⌘+U ebenfalls. Kursiv (⌘+I) geht nebenbei, hat aber keinen Knopf.
- Eingerückte (verschachtelte) Listen kennt der Editor nicht – Einrückung aus fremdem Markdown geht beim ersten Speichern verloren. Tab bleibt Fokuswechsel (Barrierefreiheit).
- Codeblöcke (```) werden angezeigt und sind bearbeitbar, haben aber keinen Knopf; Enter in leerer letzter Codezeile verlässt den Block.
- Verlauf für Rückgängig gilt nur, solange der Editor offen ist (Tab-Wechsel löscht ihn); Änderungen am Zustand/Datum oben sind darin nicht enthalten.
- Jeder Tastendruck schreibt in den Workspace (wie bisher) – bei sehr langen Notizen evtl. verzögert speichern.
- CSS `.md …` (alte Lese-Ansicht) ist jetzt unbenutzt – evtl. für Karten-Vorschau wiederverwenden oder entfernen.
- Im Test-Browser liegen in „H Slot 1“ einige leere Zusatz-Tabs (nur Testmodus, wird nicht gespeichert).
- `keyboard.type` im Testbrowser sendet Text am Stück: Kürzel nur auslösbar, wenn das Leerzeichen einzeln getippt wird (`type('[]')`, dann `type(' ')`).

## Commit-Texte V63

**Repo e-sources – Summary:** `V63: Notiz direkt formatiert schreiben, Löschen mit Rückfrage (F-206), Übergabe V63`

**Description:**
```
F-206 Eingabe und Löschen (Entscheidungen Enrico, V62):
- Notiz wird direkt formatiert geschrieben (contenteditable), kein
  Bearbeiten/Lesen, kein sichtbares Markdown; gespeichert als Markdown
- Leiste Aufgabe · Liste · Überschrift · fett (Tastatur, Touch-groß),
  Tipp-Kürzel „- “, „[] “, „# “; Enter setzt Listen fort, Enter in
  leerer Zeile beendet sie, Rückschritt macht wieder Text daraus
- Einfügen nur als reiner Text, eigenes Rückgängig, Ansagen für
  Bildschirmleser
- Neu noteDoc.ts (Markdown ↔ Blöcke) und NoteEditor.tsx
- Löschen: ohne offene Unter-Notizen sofort mit „Rückgängig“, sonst
  Rückfrage (behalten/mitlöschen/archivieren); deleteNote mit
  keepChildren
- Hilfe-Einträge und Symbole; Lastenheft F-206 ◐ V63; Übergabe V63
- Tests 333 grün
```

**Repo SchulzEnrico.github.io – Summary:** `Aktuelles: Notizen im Tab (E-Sources)`

**Description:**
```
Aktuelles (DE/EN): E-Sources hat jetzt Notizen direkt im Tab –
mit abhakbaren Aufgaben, Zustand und Fälligkeit, als Grundstein
für To-do-Liste, Kanban-Board und Eisenhower-Matrix.
```
