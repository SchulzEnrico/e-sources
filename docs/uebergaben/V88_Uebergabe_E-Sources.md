# Übergabe V88 → V89 E-Sources

Stand: 25.11.2026 · Chat V88 abgeschlossen · Nächster Chat: **V89 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V89 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206** (Schritt 7 mit „Gebaut V86“–„Gebaut V88“, Bau-Reihenfolge, N13) und **F-210 Lageplan** sowie **NF-08**. Entscheidungen zum Lageplan stehen im PDF `docs/Arbeitspakete/E-Sources – Pads mit Notizblock und Lageplan (F-206 Schritt 3, F-210).pdf`; was dort für die **freie Anordnung im Notizen-Modus** und für **Boards auf dem Desk (BL4/Z)** noch fehlt, zuerst als Claude Doc an der Seite klären (Optionen, Fragen mit Spalte „Antwort Enrico“, PDF selbst nach `docs/Arbeitspakete/`). Leitlinie weiter: **an Trello und unserer UX/UI ausrichten**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Schritt-7-Entscheidungen `V86_…`; offene kleine Punkte aus `V74_`–`V88_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V88 passiert ist

Tests **437 grün** (V87: 431). `npx tsc --noEmit -p .` sauber. Im eingebauten Browser geprüft (`localhost:2910/?test=voll`): „+ Sheet › Kanban-Board …“ zeigt Leer + 4 Vorlagen, Board „Vertrieb“ mit Lead/Kontakt/Angebot/Abschluss; ⋮ › „Als Vorlage speichern …“ (Vorschlag „Vertrieb 2“, Meldung am Ort); Cockpit „Layouts“ › Board-Vorlagen: Karten, F2 umbenennen, Entf → Rückfrage → „Rückgängig“ (Fokus jeweils richtig), „Neues Board daraus“ (Cockpit schließt, neues Board „Bewerbungen“ im Pad, Fokus auf dem Reiter); To-do › Aufgabe › V › „Bewerbungen“ → Karte in „Gefunden“, Meldung mit Rückgängig; Kartenfenster im Kanban ohne Schloss. Keine Fehler in der Konsole.

1. **BL – Board-Vorlagen (BL1–BL3)** – neu `workspace/boardTemplates.ts` (Tests): `BoardTemplate`/`TemplateColumn` in `types.ts`, `Workspace.boardTemplates` (nur eigene; mitgelieferte `BUILTIN_TEMPLATES` mit Ids `tpl-simple`, `tpl-review`, `tpl-sales`, `tpl-jobs` stehen im Code), `templatesOf`, `templateFromBoard`, `addTemplate`, `renameTemplate`, `deleteTemplate`/`restoreTemplate`, `createBoard`, `parseBoardTemplates` (in `storage.ts`), Datei `templateToFile`/`readTemplateFile`/`templateFileName`. **`FILE_VERSION` 6 → 7** (transfer.ts) – ältere Apps lehnen den Stand ab statt die Vorlagen zu verlieren (gilt rückwirkend auch für `NoteColumn.state` aus V86). Aktionen `tplFromBoard`, `tplAdd`, `tplRename`, `tplDelete`, `tplRestore`; `padCreate`/`padAddSheet`/`padOpenResult` nehmen `tpl`.
2. **Oberfläche** – neu `components/BoardTemplates.tsx`: `TemplatePick` (Menü-Seite „Leer · Vorlage …“ im Menü „Notizen & Aufgaben“ und unter „+ Sheet“), `SaveTemplateBar` (⋮ des Pads › „Als Vorlage speichern …“, Leiste `.pad__ask` unter dem Kopf), `BoardTemplateGroup` (Cockpit „Layouts“, unter der Vorschau der Desk-Layouts; Prop `onNewBoard` kommt aus `Overview.tsx`). Texte `BOARD_TPL_TEXT`, Begriff `TERMS.boardTemplate`, Hilfe `boardTemplates` (+ `HELP_ICON`).
3. **V = Verschieben nach …** in To-do, Kanban, Matrix – `Sh.moveTargets`, `Sh.moveToSheet` (Test), Aktion `sheetMoveTo`, Bauteil `MoveToBar` in `SheetViews.tsx` (Leiste `.sheet__move` am Ort, Pfeile/Enter/Esc, „Rückgängig“ in der Meldungszeile). Tooltips und Hilfe nennen V.
4. **Schloss überall (L1)** – `NoteTab` bekommt `sheet` (Kartenfenster: das Sheet selbst, Notizblock: der Block); liegt die Notiz anderswo auf einem Kanban/Abnahme-Sheet, zeigt „Zustand“ ein Schloss, Wechsel zwischen erledigt und offen → Hinweis am Ort mit „Zum Kanban“.
5. **Rad-Wahl je Sheet und Gerät** – `workspace/sheetPrefs.ts` (Test), localStorage `esource.sheetPrefs.v1`; Sheets im Pad haben jetzt `key={sheet.id}` (jedes Sheet hat seinen eigenen Zustand).
6. CSS: Block „V88 (BL): Board-Vorlagen“ und „Verschieben nach …“ am Ende von `App.css`. Lastenheft F-206 „Gebaut V88“.

## Nächste Schritte

1. **Lageplan F-210** (inkl. freie Anordnung im Notizen-Modus und BL4 „Boards auf dem Desk“) – zuerst offene Fragen als Claude Doc an der Seite klären, dann bauen.
2. Danach (N13): Notiz ↔ Quelle (Schritt 6) → Personen + Projektfokus (8) → Board (9) → Touren prüfen (F-217, auch Tour „Cockpit“ um Notizen und Board-Vorlagen). **Portfolio „Aktuelles“ nachziehen** (seit V83; Kanban, Matrix und Vorlagen sind ein sichtbarer Schritt).
3. Kleine Punkte bei Restplatz: Board-Vorlage im Cockpit bearbeiten (Spalten umstellen, ohne Board) – heute nur über ein Board; „Rückgängig“ für „Verschieben nach …“ legt die Notiz ans Ende statt an den alten Platz.
4. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V87 (siehe `V81_`, `V83_`–`V87_Uebergabe_E-Sources.md`) plus:
   - Notizen & Aufgaben › „Neues Kanban-Board …“ › Leer bzw. jede Vorlage; dasselbe unter „+ Sheet“ im Pad.
   - ⋮ des Pads › „Als Vorlage speichern …“ (Name, Enter/Esc, Meldung), WIP-Limit und „Abnahme nötig“ reisen mit.
   - Cockpit › Layouts › Board-Vorlagen: Pfeile, F2, Entf + Rückgängig, Kopieren einer mitgelieferten, „Neues Board daraus“, „Als Datei speichern“ und „Vorlage laden …“ mit dieser Datei (Name wird „… 2“), „Aus Board speichern“.
   - V in To-do, Kanban und Matrix; Esc bricht ab; Rückgängig.
   - Schloss: Notiz auf einem Kanban und zusätzlich im Notizblock/To-do → im Notizblock „Zustand“ auf erledigt → Hinweis + „Zum Kanban“.
   - Rad „Offen · Alle“ bzw. „Ordnung“ umstellen, Seite neu laden → Wahl bleibt (je Sheet).
   - Abgleich: Vorlage auf Gerät A anlegen → erscheint auf Gerät B (beide mit neuer Version laden; eine alte App meldet „Bitte diese Seite neu laden“).

## Kleine Punkte (neu in V88)

- Mitgelieferte Vorlagen stehen nur im Code – Änderungen dort gelten sofort für alle; eigene Kopien bleiben unberührt. Eigene Vorlagen dürfen keinen Namen einer mitgelieferten tragen (fallen beim Laden sonst weg).
- „Mit Prüfung“ hat eine eigene Spalte „In Prüfung“ und **keine** Regel „Abnahme nötig“ (sonst doppelte Prüfung).
- „Neues Board daraus“ im Cockpit gibt es nur, wenn Notizen auf dem Gerät an sind (`canNotes`).
- „Aus Board speichern“ schlägt das sichtbare Kanban des obersten Pads auf diesem Desk vor, sonst das erste Kanban.
- Testbrowser: Das Cockpit-Rad schaltet im verdeckten Browser oft erst nach einem zweiten Klick/Warten um – `cw.click()` und dann auf `.bt` warten. Mehrere Knöpfe heißen „Cockpit schließen“ – Esc im `#overview` nehmen.
- „Verschieben nach …“ bietet auch Notizblöcke als Ziel an; die Matrix nicht (sie ordnet nach wichtig/dringend).
- Tests in Claudes VM weiter nur mit `vitest-ersatz.js` (siehe V61); Skript wie in V86.

## Commit-Text V88

**Summary:** `V88: F-206 Schritt 7 – Board-Vorlagen (Leer · Vorlage, Als Vorlage speichern, Cockpit Layouts), V in Sheets, Schloss überall, Rad-Wahl gemerkt`

**Description:**
```
- boardTemplates.ts: Board-Vorlagen (Spalten mit Name, Bedeutung,
  WIP-Limit, Regel Abnahme; ohne Karten), mitgeliefert Einfach,
  Mit Prüfung, Vertrieb, Bewerbungen; eigene in Workspace.boardTemplates
  (Speicher, Abgleich, Datei-Sicherung), Datei laden/speichern; Tests
- Dateiformat 7 (ältere Apps verlieren Vorlagen nicht still)
- „Neues Kanban-Board …“ im Menü und unter „+ Sheet“: Leer · Vorlage …
- ⋮ des Pads: „Als Vorlage speichern …“ mit Meldung am Ort
- Cockpit „Layouts“: Gruppe Board-Vorlagen wie Desk-Layouts (Neues
  Board daraus, Umbenennen F2, Kopieren, Löschen mit Rückgängig,
  Als Datei speichern, Vorlage laden, Aus Board speichern)
- V = Verschieben nach … in To-do, Kanban und Matrix (moveToSheet)
- Schloss auch im Kartenfenster und Notizblock mit „Zum Kanban“
- Rad-Wahl „Zeigen“/„Ordnung“ je Sheet und Gerät gemerkt
- Hilfe „Board-Vorlagen“, Begriff Board-Vorlage
- Lastenheft F-206, Übergabe V88, Tests 437 grün
```
