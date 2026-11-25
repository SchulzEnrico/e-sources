# Übergabe V98 → V99 E-Sources

Stand: 25.11.2026 · Chat V98 abgeschlossen · Nächster Chat: **V99 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V99 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-217** („Gebaut V98“) und **F-206 Schritt 10** („Schritt 10 (V98)“). Entscheidungs-Docs: V96 „F-206 V96 – Main Stage, Library-Umschalter (Schritt 9) und Projekt-Desk oder Projekt-Modus (Schritt 10)“ (https://claude.ai/artifact/B8bKXzxLhqACZrJ2T1gmgE) – alle Vorschläge gelten; **neu V98** „F-206 V98 – Projekte: Datenmodell für PSP, Gantt und Basisplan (Schritt 10)“ (https://claude.ai/artifact/7H8PyejdbccEeJzj3SrKXF, PDF `docs/Arbeitspakete/F-206_V98_Projekte_Datenmodell.pdf`) – Fragen K1–K8, **Antworten von Enrico prüfen** (Spalte „Antwort Enrico“), erst dann Dateiformat 10. Leitlinien: **Trello** für Karte und Board, **IPMA ICB4** und **MS Project / iTaskX** für den ganzen Bereich Projekte, Design und Anordnung an unsere Anwendung angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V98_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V98 passiert ist

`npx tsc --noEmit -p .` sauber. Tests mit `vitest-ersatz.js`: workspace 470 (+7), persons 16, stage 4, noteSources 1 – alle grün. **Enrico bitte `npm test` in `web/`.** Im Browser noch nicht angesehen (Prüfung gesammelt).

1. **F-217 Touren** (`workspace/tour.ts`, `components/Tour.tsx`): Ziele aller Touren gegen den Code geprüft. Cockpit-Tour je Ansicht – `#overview` hat jetzt Klassen `is-portals | is-notes | is-persons | is-layouts | is-sources` (+ `is-rules`, `is-focus`), Schritte tragen sie im Selektor. Design-Tour (Rad, „Alte Systeme“, Akzent-Rad statt Farbpunkte), Sources-Tour („Library“, Library-Rad), Start-Tour (+ Main Stage, Notizen & Aufgaben, Desk | Notizen). Neue Touren `notes` und `stage` (Merker `esource.tour.notes.v1`, `.stage.v1`), Hilfe `tourNotes`/`tourStage` (Symbol `tour`), Menü „Notizen & Aufgaben“ › „Tour“ (`NT_TEXT.tour`), Knopf „Tour“ in „Main Stage …“ (`STAGE_TEXT.tour`, `requestTour('stage')`), App hört auf `notes`/`stage` im `TOUR_EVENT`; Main-Stage-Tour startet einmal von selbst 2,3 s nach der ersten Stage (`tourAutoStart('stage')`). Tour setzt am Ziel `is-tour-target` (CSS: Scheinwerfer bleibt sichtbar).
2. **Schritt 10 Logik** `workspace/projects.ts` mit Tests und Aktionen `projectAdd/Edit/Remove/Restore`, `noteProject` (siehe Lastenheft). Keine Oberfläche, kein neues Datenformat.
3. **Entscheidungs-Doc V98** (K1–K8) angelegt und als PDF abgelegt.
4. Lastenheft: F-217 ◐, Schritt 10 Stand, Zählzeile.

## Nächste Schritte

1. **Projekt-Modus bauen** (hängt an keiner Frage): Rad „Desk · Notizen · Projekte“ (`tb-mode` in App, `DESK_MODE_TEXT`, `DeskMode` um `'projects'` erweitern – prüfen, wo DeskMode gespeichert/geparst wird). Ansicht wie MS Project/iTaskX-Projektübersicht, Aufbau wie Cockpit „Personen“ (NF-08): links **Projektliste** (`projectRows`: Name eingerückt, Zustand, Start, Ende – gerechnet blass/kursiv mit Hinweis, Fortschritt-Balken, Vorgänge erledigt/gesamt, Aufwand h, Meilensteine, überfällig rot mit Zahl), Werkzeuge wie Personen („+ Projekt“ oben mit „ähnlich: …“, F2, Entf mit Rückfrage „n Vorgänge bleiben als Notizen“ und Rückgängig am Ort); rechts **Steckbrief** (ICB4: Name, Zustand-Rad, Priorität, Scope, übergeordnetes Projekt, Start/Ende mit `datesClash`-Hinweis am Ort, Budget, Ziel, Vorgehen, Organisation, `briefGaps` als „noch offen: …“). Tastatur wie Personen. Notiz → Projekt zuordnen (Feld in der Notiz, Aktion `noteProject`). Hilfe „Projekte“, Begriffe in `terms.ts`, Tour-Schritte später.
2. Nach Enricos Antworten K1–K8: Dateiformat 10 (`duration`, `manual`, `baseline`, `order`; Parser in `noteObjects.ts`/`storage.ts`, Gist), dann PSP → Gantt → Meilensteine → Basisplan → Netzplan → Ressourcen je Projekt → Bericht → Projekt-Desk.
3. Touren im Browser messen (`?test=voll`, Cockpit in allen 5 Ansichten, Tour starten; Notizen-Tour mit offenem Pad; Main Stage setzen → Tour startet).
4. Portfolio „Aktuelles“ nachziehen (seit V83; `~/Projects/SchulzEnrico.github.io`, `#aktuell` DE/EN): Notizen, Kanban, Personen/Projektfokus, Main Stage, Touren.
5. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V97 plus:
   - `npm test` in `web/`.
   - Cockpit: in jeder Ansicht (Portale, Notizen, Notizen › Fokus, Personen, Layouts, Library) „Tour“ → nur passende Schritte, Texte stimmen.
   - Hilfe › „Tour Design“: Rad Darstellung, „Alte Systeme“, Akzent-Rad (kein fehlender Schritt).
   - Start-Tour (Hilfe › Tour): Scheinwerfer sichtbar umrandet, Notizen & Aufgaben, Desk | Notizen.
   - Menü „Notizen & Aufgaben“ › „Tour“ mit offenem Pad: Pad, Sheets, Quellen, Zuständig, Dock, Fokus-Zeile.
   - Erste Main Stage setzen → nach der Meldung startet „Main Stage“-Tour einmal; in „Main Stage …“ Knopf „Tour“.
   - Suche „Tour Notizen“ / „Tour Main Stage“.

## Kleine Punkte (neu in V98)

- Notizen-Tour startet nicht von selbst (würde beim ersten Pad den Fokus aus dem Schreiben reißen) – nur Menü, Hilfe, Suche, Hinweis in der Start-Tour.
- Main-Stage-Tour: Auto-Start auch, wenn die Stage aus dem Cockpit (Taste S) gesetzt wird? Nein – nur über `stageOf().onToggle` (Scheinwerfer/⋮). Cockpit-Weg ggf. nachziehen.
- Tour-Texte stehen weiter in `tour.ts` (wie bisher), nicht in `terms.ts`.
- `projects.ts` `rowOf`: Fortschritt nach Plan-Aufwand, archivierte Vorgänge zählen als erledigt (`isFinished`).
- PDF des Docs wurde aus dem Inhalt mit pandoc/wkhtmltopdf erzeugt (gleicher Text wie das Doc).

## Commit-Text V98

**Summary:** `V98: F-217 Touren je Ansicht, Touren „Notizen & Aufgaben“ und „Main Stage“; F-206 Schritt 10 Logik Projekte, Doc Datenmodell`

**Description:**
```
- F-217: Cockpit-Tour je Ansicht (Portale, Notizen, Fokus, Personen,
  Layouts, Library) über Klassen am #overview
- Design-Tour (Rad, alte Systeme, Akzent-Rad), Sources-Tour (Library,
  Library-Rad), Start-Tour (Main Stage, Notizen & Aufgaben, Desk | Notizen)
- Neue Touren „Notizen & Aufgaben“ und „Main Stage“ mit Hilfe, Suche,
  Menü- bzw. Dialog-Knopf; Main-Stage-Tour einmal nach der ersten Stage
- Tour-Ziel bleibt sichtbar (is-tour-target), Tests F-217
- F-206 Schritt 10: workspace/projects.ts (Projekte anlegen, ändern,
  löschen mit Rückgängig, Projektliste als Baum, Steckbrief-Lücken)
  mit Tests und Aktionen
- Entscheidungs-Doc V98 Datenmodell PSP/Gantt/Basisplan (K1–K8) als PDF,
  Lastenheft, Übergabe V98
```
