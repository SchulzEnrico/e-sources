# Übergabe V62 → V63 E-Sources

Stand: 23.11.2026 · Chat V62 abgeschlossen · Nächster Chat: **V63 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V63 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md` (vor allem **F-206**). Für Technische Rahmenbedingungen, Arbeitsregeln und die lange Liste „Kleine Punkte“ gilt weiter `docs/uebergaben/V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`). Dann „Nächste Schritte“ ab 1.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` – F-206 jetzt „◐ V62“.
- **Entscheidungs-Doc F-206:** https://claude.ai/artifact/NAbnAYie4DdKRkM5hKWXJa · PDF in `docs/Arbeitspakete/` (nur lokal).
- **Dashboards:** `docs/Dashboards/` (nur lokal).
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – nachzuziehen: Gist-Abgleich (V58/V59), Slot als Datei (F-158), Farbpipette (F-147), Notizen (F-206, erster sichtbarer Schritt V62).
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Demo:** https://schulzenrico.github.io/e-sources/
- **Portfolio:** `~/Projects/SchulzEnrico.github.io` – „Aktuelles“ (`#aktuell`, DE/EN): **jetzt mitziehen**, Notizen sind der erste sichtbare Schritt von F-206 (noch nicht gemacht).

## Was in V62 passiert ist

- **Git-Durcheinander geklärt:** Der V61-Commit `93b32d4` enthält versehentlich schon das Datenmodell aus V62 (`notes.ts`, `types.ts`, `storage.ts`, `slotFile.ts`, Tests). Nicht zurückgedreht (schon gepusht, Code in sich fertig).
- **Ablage nur lokal:** `docs/Dashboards/` und `docs/Arbeitspakete/` stehen in `.gitignore`, die PDFs sind aus Git genommen (Commit `8017b19`). Sie bleiben im alten Commit `93b32d4` auf GitHub sichtbar (Repo öffentlich) – ganz entfernen ginge nur durch Umschreiben der Geschichte; Enrico fragen, falls gewünscht.
- **F-206 Schritt 1 – Datenmodell** (`web/src/workspace/notes.ts`, Typen in `types.ts`):
  - `Note` mit allen Feldern aus F-206 (Zustand, Grund, Eltern, Vorgänger `after` mit Art `done`/`date`, Spur `trail`, Kategorie, Tags, Herkunft, wichtig/dringend, Anhänge, delegiert, weitergeleitet, `notBefore`, `due`).
  - `NoteView` (Art `block`/`todo`/`kanban`/`eisenhower`, Name, Kategorie, `ids`, Kanban `cols`, Regel `review`).
  - `Workspace.notes`, `Workspace.noteViews` (optional); `Tab.note` bzw. `Tab.view` = nur Verweis, nie zusammen mit `url`.
  - Reine Funktionen: anlegen/ändern (`createNote`, `updateNote`, `markForwarded`), Zustand (`setState` mit Board-Regel → „in Prüfung“, `confirmReview`, `stateOf` rechnet „wartet“ von selbst aus: offener Vorgänger `done`, „nicht beginnen vor“, Vorgänger `date` mit „fällig am“ → `earliestStart`), Unter-Notizen (`setParent` mit Kreis-Prüfung und Weg, `progress`, `nextOpenChildren`), Vorgänger (`addLink` mit Kreis-Prüfung und Weg, `removeLink`, `successorsOf`), Ansichten (`createView` mit Standardnamen, Kanban startet mit „Offen · In Arbeit · Erledigt“, `placeNote` verschieben/„auch hier“/umsortieren, `removeFromView`, Spalten `addColumn`/`renameColumn`/`moveColumn`/`removeColumn` – Karten an den Nachbarn, letzte bleibt), `quadrantOf` (Eisenhower), Löschen mit Rückgängig (`deleteNote` samt Unter-Notizen + `restoreNotes`, `deleteView` + `restoreView`).
  - Grenzen: `VIEW_MAX` 200 (Unter-Notizen zählen nicht), `COLUMN_MAX` 8, Spur `TRAIL_MAX` 200; Textänderungen derselben Person in 10 min = ein Spur-Eintrag.
  - Speicher: `parseNotes`/`parseNoteViews`/`fixDelegated` in `parseWorkspace` (Doppelte, Kreise, unbekannte Bezüge fallen weg). Abgleich (Gist) nimmt sie automatisch mit (ganzer Workspace). Slot-Datei (F-158) nimmt Notizen der Tabs samt Unter-Notizen und Ansichten mit, beim Laden neue Ids (`notesForPanels`, `importNotes`).
- **F-206 Schritt 2 – Notiz im Tab** (`web/src/components/NoteTab.tsx`):
  - Leerer Tab zeigt „Neu in diesem Tab: Notiz · To-do-Liste · Kanban-Board · Eisenhower“ (`NewInTab`). Das „+“ bei den Tabs ergibt einen leeren Tab, also dieselbe Auswahl.
  - Notiz-Ansicht: Bearbeiten/Lesen (Strg/⌘+Enter = Lesen), Titel (leer = erste Zeile), Text mit Markdown light (Überschriften, Listen, abhakbare Aufgaben, Zitat, Code, fett/kursiv, Links – ohne `innerHTML`), Zustand (bei „wartet“ Feld „Grund“), wichtig, dringend, „nicht beginnen vor“, „fällig am“, Hinweis „wartet von selbst …“, angelegt/geändert.
  - Tab-Beschriftung = Titel der Notiz bzw. Name der Ansicht (`tabLabel(t, ws)`).
  - Tab schließen: leere Notiz (in keiner Ansicht) wird still verworfen, sonst bleibt sie in der Library.
  - Ansichten (To-do, Kanban, Eisenhower) zeigen vorerst nur einen Platzhalter („kommt im nächsten Bauschritt“).
  - Reducer: `tabNote`, `noteEdit`, `noteState`; `closeTab` verwirft leere Notiz.
  - Texte in `terms.ts` (`TERMS.note`, `noteState`, `todo`, `kanban`, `eisenhower`, `NOTE_TEXT`), Hilfe-Einträge `note`, `noteState`, `todo`, `kanban`, `eisenhower`, `newNote`; Symbole `note`, `todo`, `kanban`, `matrix`.
- Tests: **327 grün** (vorher 304). Im eingebauten Browser mit `?test=voll` geprüft: Notiz anlegen, Fokus im Textfeld, Lesen mit Markdown, Aufgabe abhaken ändert den Text, „wartet“ zeigt „Grund“, leere Notiz beim Schließen verworfen, Kanban-Platzhalter.

## Nächste Schritte

1. **Commit** (Enrico, GitHub Desktop): Repo `e-sources` (Text unten), dann PO.
2. **Portfolio „Aktuelles“** (DE/EN) um „Notizen im Tab“ ergänzen (Wunsch V57), Commit dort.
3. **Notiz-Eingabe und Löschen umbauen (entschieden von Enrico am Ende von V62, steht im Lastenheft F-206 unter „Eingabe“ und „Löschen“ – kein Doc mehr nötig):**
   - **Eingabe:** „Das Intuitivste – es soll Arbeit abnehmen, keine machen.“ Direkt in der formatierten Notiz schreiben (`contenteditable`, kein Bearbeiten/Lesen-Wechsel, kein sichtbares Markdown); Enter setzt Aufgaben fort, Enter in leerer Aufgabe beendet die Liste, Rückschritt am Zeilenanfang macht Text daraus; Leiste Aufgabe · Liste · Überschrift · fett (Touch-groß, Tastatur, NF-03); Strg/⌘+B und Tipp-Kürzel („- “, „[] “) nebenbei. Speichern weiter als Markdown (`toggleTask`/`Markdown` in `NoteTab.tsx` werden zu Umwandlung HTML ↔ Markdown). Sicher: nur eigene Elemente zulassen, Eingefügtes als reinen Text.
   - **Löschen:** alle Unter-Notizen erledigt/keine → sofort mit „Rückgängig“ (`flash`); sonst Rückfrage `ask` („n Unter-Notizen sind noch offen“: Alle mitlöschen · Unter-Notizen behalten (rutschen hoch) · Abbrechen); „Archivieren“ anbieten. `deleteNote` bekommt eine Variante „Kinder hochziehen“ (Eltern der Kinder = Eltern der gelöschten Notiz), Tests dazu.
4. **F-206 Schritt 3 – Library und Suche für Notizen:** Notizen in der Library/Suche finden und in einem Tab öffnen (sonst ist eine Notiz, deren Tab eine Adresse bekam oder geschlossen wurde, nur noch über „Zuletzt geschlossen“ erreichbar). Notiz löschen mit „Rückgängig“ (`deleteNote`/`restoreNotes` + `flash`). Notiz/Ansicht auch über Portal-Menü und Suche anlegen.
5. Danach weiter nach Bau-Reihenfolge F-206: To-do-Liste → Kanban-Board → Eisenhower-Matrix → Notizblock und Schnell erfassen → Unter-Notizen, Vorgänger, Spur (Oberfläche) → Anhängen, Weiterleiten, Delegieren, Sprachnotiz → Hilfe und Tour.
6. Kleine offene Punkte (Barrierefreiheit, bei Restplatz): siehe V61 Nr. 5.
7. Später: Entwicklerwerkzeuge (F-16/F-18/F-115), Stand auf allen Geräten zurücksetzen.
8. **Spaces und Cases sowie Slot als Datei (F-158)** prüft Enrico ganz am Ende (nicht vorher fragen).

## Kleine Punkte (neu in V62)

- Adresse in einen Notiz-Tab eingeben ersetzt die Notiz im Tab (`go` entfernt `note`/`view`); die Notiz bleibt in der Library, ist aber bis Schritt 3 nur schwer wiederzufinden. Eine **leere** Notiz bleibt dabei als leere Leiche liegen – in Schritt 3 beim Navigieren ebenfalls still verwerfen.
- Link über einen Notiz-Tab ziehen ist gesperrt (kein „Loslassen zum Öffnen“).
- Löschen einer Notiz nimmt Unter-Notizen bisher still mit – wird nach dem Doc (Nächste Schritte 3) durch eine Sperre bzw. Rückfrage ersetzt.
- Kanban-Spalten haben noch keine Zuordnung zu Zuständen (z. B. Spalte „Erledigt“ = erledigt). Beim Bau des Boards entscheiden (evtl. Claude Doc).
- Tabs zeigen auf Notizen/Ansichten, die es (noch) nicht gibt („Notiz fehlt“) – bleiben bewusst stehen (Abgleich kann sie nachliefern).
- Andere Stellen mit `tabLabel(t)` ohne `ws` (Cockpit, Zuletzt geschlossen, Suche) zeigen nur „Notiz“ bzw. „Ansicht“ – bei Bedarf `ws` mitgeben.
- Im Testbrowser fügt `+` (per `evaluate`) neue Tabs an, macht sie aber nicht sichtbar – Tab danach anklicken (`getByRole('tab').nth(i)`). Knopf heißt bei vollem Fokus nur „Neuer Tab“.
- `Zustand`-Feld hat den Erklärtext als `title` am Label; Bildschirmleser hören ihn als Gruppenname (lang). Evtl. kürzen.
- Textfeld schreibt bei jedem Tastendruck in den Workspace (wie die Adresszeile) – bei sehr langen Notizen evtl. verzögert speichern.

## Commit-Text V62

**Repo e-sources – Summary:** `V62: Notiz im Tab (F-206 Schritt 2), Übergabe V62`

**Description:**
```
F-206 Notizen und Ansichten, Schritt 2 (Datenmodell kam schon mit 93b32d4):
- Leerer Tab bietet Notiz, To-do-Liste, Kanban-Board, Eisenhower an
- Notiz im Tab: Bearbeiten/Lesen mit Markdown light (Aufgaben
  abhakbar), Titel aus erster Zeile, Zustand mit Grund, wichtig,
  dringend, nicht beginnen vor, fällig am, „wartet“ von selbst
- Tab trägt den Titel; leere Notiz wird beim Schließen verworfen
- Ansichten vorerst als Platzhalter
- Begriffe, Hilfe-Einträge und Symbole für Notizen
- Lastenheft F-206 ◐ V62; Übergabe V62 → V63
- Tests 327 grün
```
