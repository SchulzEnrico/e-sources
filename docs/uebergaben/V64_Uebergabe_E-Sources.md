# Übergabe V64 → V65 E-Sources

Stand: 24.11.2026 · Chat V64 abgeschlossen · Nächster Chat: **V65 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V65 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md` (vor allem **F-206** mit dem neuen Abschnitt „Pads, Dock, Board“ und **F-207**). Lies dann das Entscheidungs-Doc (Link unten) mit den Docs-Werkzeugen, vor allem die Tabelle „Fragen an Enrico“. Für Technische Rahmenbedingungen, Arbeitsregeln und die lange Liste „Kleine Punkte“ gilt weiter `docs/uebergaben/V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`), dazu die kleinen Punkte aus V62 und V63. Dann „Nächste Schritte“ ab 1.

## Links

- **Entscheidungs-Doc (V64):** https://claude.ai/artifact/A8Uo5rH5cRejM14FgNS9WK („E-Sources – Notizen in der Library (F-206 Schritt 3)“; Inhalt ist inzwischen viel breiter: Notiz-Welt, Pads, Dock, Board, Projekte, ICB4). Noch nicht als PDF abgelegt.
- **Entscheidungs-Doc F-206 (V61):** https://claude.ai/artifact/NAbnAYie4DdKRkM5hKWXJa
- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` – F-206 „◐ V64“, neu F-207, Begriffstabelle um Note, Sheet, Pad, Dock, Board, Pin ergänzt.
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – nachzuziehen: Gist-Abgleich (V58/V59), Slot als Datei (F-158), Farbpipette (F-147), Notizen (F-206 V62–V64).
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources` · **Demo:** https://schulzenrico.github.io/e-sources/
- **Portfolio:** `~/Projects/SchulzEnrico.github.io` – „Aktuelles“ (DE/EN) in V64 um den geplanten Projekt- und Aufgabenbereich nach IPMA ICB4 ergänzt (Commit-Text unten).

## Was in V64 passiert ist

- Commits aus V63 waren schon gemacht und gepusht (e-sources `4ef24e1`, Portfolio `8b400b1`). Enrico: „Schreiben auf dem Mac geht“, Rest (iPhone/iPad, Windows) prüft er später.
- **F-206 Schritt 3 (erster Teil) – Suche:**
  - `notes.ts` neu: `searchNotes` (Titel, Text ohne Markdown, Tags, Kategorie, delegiert; Ansichten über Name und Art via `VIEW_BASE`; leere Notizen nie; Titeltreffer vorn, Archiviertes hinten), `plainText`, `tabShowing`, `openNoteIn` (schon offen → „shown“, sonst leerer aktiver Tab, sonst neuer Tab; „full“/„missing“), `dropIfEmpty` (leere Notiz verwerfen, wenn in keiner Ansicht und kein anderer Tab sie zeigt), `leaveTab` (Tab wieder leer; leere Notiz bzw. Ansicht ohne Notizen wird verworfen).
  - Reducer: `openNote`, `newNote` (anlegen + öffnen im Portal), `tabLeave`; `setUrl` verwirft leere Notiz beim Eingeben einer Adresse; `closeTab` nutzt `dropIfEmpty`.
  - `Search.tsx`: Gruppe „Notizen“ (Zustand, Ausschnitt, „schon offen“), Ansage zählt Notizen mit; Prop `onOpenNote`.
  - `App.tsx`: `openNoteHit` (zeigt vorhandenen Tab oder öffnet im aktiven Portal, Fokus in `.nedit`, Ansage), `newNoteHere`; Hilfe-Runs `newNote`, `newTodo`, `newKanban`, `newEisenhower`.
  - Hilfe: `newNote` (jetzt ausführbar), neu `newTodo`, `newKanban`, `newEisenhower`, `findNote`; Symbole in `HELP_ICON`. Fragen umgehängt (keine Doppelten).
  - Ansichten (Platzhalter) haben Knopf **„Zurück zur Auswahl“** (Wunsch Enrico; Fokus danach auf „Notiz“) und Hinweis, dass Einträge mit den nächsten Bauschritten kommen.
  - Tooltip am Notiz-Tab zeigt den Titel (`PanelFrame.tsx`, `tabLabel(t, p.ws)`).
- Tests: **342 grün** (vorher 333). Im eingebauten Browser (`?test=voll`) geprüft: Notiz über Suche anlegen (Fokus im Text), Tab schließen, über Suche wiederfinden und öffnen, zweites Mal „schon offen“ (kein neuer Tab), volles Portal meldet sich, Kanban über Suche anlegen, „Zurück zur Auswahl“ verwirft leere Matrix.
- **Großes Konzeptgespräch im Doc** (Kommentare Enrico) – Stand im Lastenheft F-206 „Pads, Dock, Board“ und F-207:
  - **Notiz-Welt wie Webseiten-Welt:** Note = Source · Sheet = Tab (Notizblock, To-do, Kanban, Eisenhower, Erinnerungen …) · Pad = Portal (schwebendes Fenster, mehrere Sheets) · Dock = Slot (Bündel, durchschaltbar, Ort frei, auch außerhalb des Bildes mit Lasche; verdeckt keine Portale, drängt das Layout zurück; ganz wegschaltbar) · Board = Desk im Note Mode.
  - **Note / Task / Reminder** = dasselbe Objekt mit zuschaltbaren Funktionen (Tabelle im Doc); im Kanban wird eine Note von selbst Task; Eisenhower-Feld „wichtig, nicht dringend“ = Reminder-Ecke; Reminder kann delegiert sein („gilt für“).
  - **Task außerhalb seines Ablaufs:** Abhaken gesperrt (Schloss + Sprung zum Kanban; frei ohne Board und Abnahme), Löschen eines früheren Tasks nur nach Rückfrage mit Herkunft und Spur.
  - **Entschieden:** Pads als eigene Ebene über dem Desk (A); Note Mode als Schalter je Desk (A) mit eigenem Layout (Umschalter „Desk · Board“ im Layout-Menü) und Design-Voreinstellung; Knopf und Cockpit-Ansicht heißen „Notes & Tasks“; Smartphones nur Dock; Rahmen heißt **Scope** (bisher Case; Case überall umbenennen, im Code alter Name), Leistungsumfang (ICB4 3.03) heißt deutsch **Leistungsumfang** (Glossar erklärt beides, Projektbericht „Leistungsumfang (Scope nach ICB4)“, Englisch „Deliverables“).
  - **Ebenen:** Space › Scope (bisher Case) › Projekt (mit Teilprojekten) › Sheet › Note; Portfolio-Sheet; Übersichts-Sheets wählen Bereich.
  - **Weitere Sheet-Arten (später):** Netzplan, Gantt, Burndown, Wasserfall, V-Modell, Projektplan, Zielmatrix, Mindmap, Organigramm, Kalender, RACI, Meilenstein-Roadmap, Statusbericht, Kapazität; dazu aus dem ICB4-Abgleich: Projektsteckbrief, Anforderungsliste, PSP, MTA, Protokoll, Abnahmekriterien, Budget/Kosten, Ressourcenplan, Beschaffung, Projektabschluss, Risiko-, Stakeholder-Sheet, Änderungsliste. Scrum später.
  - **F-207 Main Stage** (fester Arbeitsbereich; Wort entschieden, nicht „Pin“/„Target“/„Fokus“ – Fokus ist schon belegt): Schalter „Auf die Main Stage“ im Portal-Kopf, Verhalten wählbar, Pads nie darüber.
  - **Projektbericht ausgeben** (Wunsch Enrico): Bericht je Projekt nach ICB4-Gliederung, PDF/Word/Markdown; Vorlage = Enricos Projektreport.
  - **Planungs-Check** (beschlossen): feste Regeln finden Planungsfehler (Termin-Konflikte, Überlast, Budget, Lücken, Befugnis); später KI.
  - **Projekt-Dashboard** mit frei wählbaren Kacheln; Verantwortungsmatrix mit Befugnissen und Vertretung.
  - **F-208 Glossar** (neu): alle Begriffe A–Z in der Anwendung, inkl. Notiz-Welt und ICB4-Begriffe; Quelle `terms.ts`/`help.ts`.

## Nächste Schritte

1. **Commits** (Enrico, GitHub Desktop): Repo `e-sources` und Repo `SchulzEnrico.github.io` (Texte unten), jeweils PO. Im nächsten Chat mit dem Bau beginnen (Wunsch Enrico).
2. **Projektreport ist ausgewertet** (V64, Abschnitt „Abgleich mit Enricos Projektreport“ im Doc, R1–R15; im Lastenheft F-206). Der Report liegt nicht im Repo – bei Bedarf erneut hochladen lassen.
3. **Doc fertig beantworten:** offene Fragen 1, 3, 4 und 6–10 (Spalte „Antwort Enrico“). Danach Doc als PDF exportieren (Name des Docs › Export › PDF) nach `docs/Arbeitspakete/`.
4. **Danach Lastenheft F-206 aufräumen:** Bau-Reihenfolge neu festlegen (Vorschlag: Datenmodell Sheet/Pad/Dock/Projekt → Pads mit Notiz-Sheet → Dock → Knopf „Notes & Tasks“ + Cockpit → To-do → Kanban → Eisenhower → Board/Note Mode → F-207 Pin → Library-Umschalter → weitere Sheets). Bei großen Modellfragen (Sheet = bisheriges `NoteView`? Pad-Plätze je Gerät/Desk) erst Claude Doc.
5. Kleine Punkte (Barrierefreiheit, bei Restplatz): siehe V61 Nr. 5 und V62/V63.
6. Später: Entwicklerwerkzeuge (F-16/F-18/F-115), Stand auf allen Geräten zurücksetzen.
7. **Spaces und Cases sowie Slot als Datei (F-158)** prüft Enrico ganz am Ende (nicht vorher fragen).

## Kleine Punkte (neu in V64)

- Suche: Notiz-Treffer zeigen den Ausschnitt nur sichtbar; im `aria-label` stehen Titel, Zustand und Ziel (Ausschnitt nicht).
- „Neue Notiz“ über die Suche legt bei belegtem aktiven Tab einen neuen Tab an; bei vollem Portal (9 Tabs) Hinweis. Im Testmodus sind alle Portale voll – erst einen Tab schließen.
- `tabLabel(t)` ohne `ws` (Cockpit, Zuletzt geschlossen) zeigt weiter nur „Notiz“/„Ansicht“.
- Im Doc hängen viele frühere Kommentare jetzt lose in der Kommentarliste (Umbauten); inhaltlich alles eingearbeitet.

## Commit-Text V64

**Repo e-sources – Summary:** `V64: Notizen in der Suche finden, öffnen und anlegen; Zurück zur Auswahl (F-206); Lastenheft Pads/Dock/Board, F-207`

**Description:**
```
F-206 Schritt 3, erster Teil:
- Suche findet Notizen (Titel, Text, Tags) und Ansichten (Name, Art);
  Enter zeigt sie dort, wo sie offen sind, sonst im aktiven Portal
  (leerer Tab, sonst neuer Tab; volles Portal meldet sich)
- Neue Notiz / To-do-Liste / Kanban-Board / Eisenhower-Matrix als
  Funktionen in der Suche; Hilfe „Notiz wiederfinden“
- Leere Notiz wird auch beim Eingeben einer Adresse still verworfen
- Ansichten: Knopf „Zurück zur Auswahl“ (leere Ansicht wird verworfen)
- Tooltip am Notiz-Tab zeigt den Titel
- Neu in notes.ts: searchNotes, openNoteIn, tabShowing, dropIfEmpty,
  leaveTab
- Lastenheft: F-206 um Pads, Dock, Board, Note/Task/Reminder, Ebenen
  (Scope › Projekt › Sheet › Note), ICB4-Abgleich ergänzt; neu F-207
  Main Stage; neu F-208 Glossar; Begriffe erweitert; Übergabe V64
- Tests 342 grün
```

**Repo SchulzEnrico.github.io – Summary:** `Aktuelles: geplanter Projekt- und Aufgabenbereich nach IPMA ICB4 (E-Sources)`

**Description:**
```
Aktuelles (DE/EN): E-Sources plant einen Projekt- und Aufgabenbereich
nach IPMA ICB4 – schwebende Fenster für Notizen, Aufgaben und
Erinnerungen, Projekte mit Teilprojekten, PSP, Netzplan mit
Anordnungsbeziehungen, Risiko- und Stakeholder-Analyse,
Planungs-Check und Projektbericht auf Knopfdruck.
```
