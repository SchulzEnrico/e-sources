# Übergabe V111 → V112 E-Sources

Stand: 26.11.2026 · Chat V111 · Nächster Chat: **V112 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V112 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-228** (Doc https://claude.ai/artifact/UUvw5HtX9663ESsT4tS5my, Abschnitte „Entschieden V111“ und „Gebaut V111“ – **Stufe 1 gebaut, Stufe 2 weiter**), **F-229**, **F-222** und **F-226** (Absätze „Gebaut V111“ / „Feinschliff V111“), **F-227** (Handbuch) und **F-206 Schritt 10**. Weitere Docs: F-226 https://claude.ai/artifact/QxM6UPG6NFaAgkJwsb8EVy, F-222 V108 https://claude.ai/artifact/MXgwEhtFcAJSLYc13zbZd8. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Trello**, **IPMA ICB4 / GPM-Leitfaden Z01D Rev. 09**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag; Tests: `vitest-ersatz.js` nach `$HOME/vt2/node_modules/vitest/index.js`, `run.sh` wie unten), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V111_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. Direkt mit „Nächste Schritte“ ab 1 **bauen**.

## Was in V111 passiert ist

`npx tsc --noEmit -p .` sauber. Tests (`$HOME/vt2/run.sh`: tsc nach `$HOME/vt2/out`, dann workspace, persons, stage, noteSources, gpm): workspace **526** (+4), persons 17, stage 4, noteSources 1, **gpm 28** (+2) – alle grün. **Im eingebauten Browser geprüft** (`localhost:2910/?test=voll`, 1440 × 900): Tour „Entscheidungen“ (ohne Entscheidung 7 Schritte), Beispiel im Pad, Rad „Schritt“ › Bewertung, Griffe ⠿, Rad „Punkte“ (12 Punktwerte), „+ Bezug“ › Rad „Art“ › Person verbunden mit Meldung am Ort; Rad „+ Sheet“ (Pfeile + Enter legt an, Ende = 6 von 6, Klick in Stellung „+ Sheet“ öffnet Menü mit „Entscheidung“); „Entscheidung“ aus dem Menü öffnet „Neue Entscheidung“ frei im Pad; Notizen-Modus: Anfasser ↔ sichtbar, Strg+Z zeigt „Anordnung rückgängig gemacht“ – keine Seitenfehler. **Nicht geprüft:** Ziehen der Pad-Kante im Testbrowser (tab.drag bewegte nichts – Enrico bitte mit der Maus), Drag der Zeilen ⠿ (nur per Code), View-Rad im Notizen-Modus.

1. **F-222 Rest:** `components/DecisionLinks.tsx` (Chips, „+ Bezug“, Rad „Art“, Suche, Entf/Enter, Rückgängig), Op `optLink`, `linkName`, `linkTargets`; `useRowDrag` (Griff ⠿, `DRAG_DC`) in `CritStep`/`ScoreStep`; Rad „Punkte“ (`POINTS_KEY`); Tour `TOURS.decisions` + `TOUR_KEY`, Auto-Start in `Decisions`, Knopf „Tour“, Hilfe `tourDecisions`, App-Zweig in `TOUR_EVENT` (öffnet bei Bedarf das Pad). E3 im Pad: dasselbe Bauteil – passt.
2. **Entscheidung unter Sheets (Wunsch Enrico):** Pad-Kopf „+ Sheet“ jetzt `ModeWheel` mit `onPress` (neu im ModeWheel: Drehen wählt, Klick/Enter löst aus) über `Menu.control` (neu in `PanelFrame`), `MenuPages.start`; Stellungen + Sheet · Notiz · To-do · Kanban · Matrix · Entscheidung (kurze Namen `PAD_TEXT.addSheetShort`). „Entscheidung“ auch im Menü „Notizen & Aufgaben“, im Cockpit „Notizen“ (`onNotesNew('decision')`) und Hilfe `newDecision`; `newDecisionHere` in App / `addDecision` im Pad → `dcAdd` frei + `openWorkPad`.
3. **F-226 Feinschliff:** `SheetViews.Signs` und `PersonChips` mit `Gp.planHours` (Chip „aus Einsätzen“); `removePerson`/`undoRemovePerson` mit `use`; `Fk.dupCodesOf` + Anzeige in `ProjectForms` (`.pjf__dup`, `.is-dup`); `ProjectSteer` „Beantragt von“ als `<select>` (`STEER_TEXT.byNone/byText`).
4. **F-229 Notizen-Modus + Rückgängig:** CSS-Anfasser `.padlayer.is-notes .pad__grip.is-border` (e/s/se mit ::after); `notesView`/`noteViewRects` in App (View-Rad schaltet im Notizen-Modus die Pads, `setView` verzweigt); `workspace/layoutUndo.ts`, `useWorkspace` gibt `[ws, dispatch, undoLayout]`, Aktion `layoutUndo`; Strg/⌘+Z-Hörer in `DeskApp` (`LAYOUT_UNDO_TEXT`), Hilfe `undoLayout`, `notesView`.
5. **Räder (Enrico):** `wrapsFor` immer false (Anschlag), `clickTurn` pendelt, `ModeWheel.step` mit `swing`; Tests angepasst.
6. **Karten-Hover (Enrico):** `.kcard__main` ohne eigenen Rahmen, Hover/Fokus über `.kcard:has(...)`.
7. **F-228 Doc** angelegt (Überlauf-Menü, U1–U9), PDF in `docs/Arbeitspakete/`; von Enrico entschieden und **Stufe 1 gleich gebaut** (vorgezogen für die Demo): `components/Overflow.tsx` (`useOverflow`), CSS-Block „V111 F-228 Überlauf“, eingebaut in Pad-Kopf + Sheets-Reiter (`Pad.tsx`), Portal-Kopf + Tabs (`PanelFrame.tsx`), Mitte der Kopfleiste (`App.tsx`, `tbCenterRef`). Geprüft bei 1000 px: knapp „»“ mit Zahl, schwebend vollständig und über dem Nachbarn, Rad darin bedienbar.
8. **Überlauf nachgebessert (Enrico 09:08–09:18):** Original-Aussehen, deckend (`--ovf-under`), bleibt im Bildschirm, Knopf bleibt unter dem Zeiger, Reiter als Liste nach unten (`drop`, `forceTight` im Pad-Kopf), Leuchtrahmen + Abdunkeln nur beim Hovern auf der Leiste, Icons (Leiste `spread`, Reiter `tab` + ▾), Esc global + kein sofortiges Wieder-Öffnen; Messen stellt die Klassenliste vollständig wieder her. Karten: Erledigt-Kreis immer sichtbar, dunkles Glas.
9. **Notizen-Modus nachgebessert (Enrico):** View 2 × 2 / 2 mit Anfassern (`noteViewTree`), Kante zieht die ganze Linie (`T.resizeAligned`, Test). Handbuch V111 (2, 5, 7, 7.1, 8, Änderungsverzeichnis), Lastenheft F-222/F-226/F-228/F-229, `APP_VERSION = 'V111'`.

## Nächste Schritte

1. **F-228 Stufe 2:** Überlauf auch für Cockpit-Kopf, Projekt-Ansichten (Formulare, Entscheidungen), Pad-Fuß und Stapel-Leiste (StackBar senkrecht – eigener Fall), Touren mit Zielen im Überlauf (Tour öffnet „»“ vorher). Senkrechte Lage auf einem echten schmalen Fenster prüfen. Kurznamen im Rad „+ Sheet“ dürfen wieder lang werden, wenn der Pad-Kopf überläuft.
2. **F-226 Stufe 2** (Testphase): Abnahmekriterien-Formular, AKV, DKI-Matrix, AP-Formular, Statusbericht, Kosten-Ganglinie, Report-Ausgabe PDF, Portfolios.
3. Dann Schritt 10 laut Stufenplan (Basisplan, Netzplan, F-220, Projekt-Desk).
4. **Prüfliste für Enrico** (alles aus V77–V110 plus):
   - `npm test` in `web/`.
   - Entscheidung › Bewertung: „+ Bezug“ (Rad „Art“, tippen, Enter), Chip öffnen (Notiz/Source), Entf löst + Rückgängig; Rad „Punkte“; Zeilen am ⠿ ziehen (Kriterien und Lösungen).
   - Knopf „Tour“ bei den Entscheidungen; Suche „Tour Entscheidungen“.
   - Pad-Kopf: Rad „+ Sheet“ drehen und klicken; Stellung „+ Sheet“ › Menü; „Entscheidung“ aus Rad, Menü „Notizen & Aufgaben“ und Cockpit „Notizen“.
   - Räder: am Ende nicht mehr ringsum; Klick am Ende geht zurück.
   - Notizen-Modus: Anfasser ↔ ↕ ⤡ sichtbar und ziehbar (Ecke = beide Kanten), Rad „View“ 2 × 2 / 2 / Solo; Pad/Portal verschieben → **Strg/⌘+Z**.
   - Kanban/Matrix: Hover an der Karte ohne inneren Rahmen.
   - Kanban/Matrix: Erledigt-Kreis immer da (dunkles Glas), kein Springen des Textes.
   - **Überlauf:** Fenster schmal ziehen → Kopfleiste, Portal-Köpfe, Tabs, Pad-Köpfe zeigen „»“ (Verschieben und ✕ bleiben); Zeiger auf „»“ → dieselbe Leiste schwebt ganz; Menü/Rad darin bedienen; Leuchtrahmen um Leiste + Pad, Rest abgedunkelt; rechtes Pad: Leiste bleibt im Bild; Pad mit mehreren Sheets: Kopf schwebend zeigt nur den aktiven Reiter, ▾ klappt die Sheets nach unten; Portal-Tabs ▾ als Liste; Abdunkeln nur, solange der Zeiger auf der Leiste ist; Esc (auch ohne Fokus darin); Tastatur Tab → „»“ → Enter.
   - Notizen-Modus, View 2 × 2: Anfasser da; Mitte ⤡ zieht alle vier; Kante zieht die ganze Linie (auch im Dashboard).
   - Personen › Person löschen mit Einsätzen (Lackiermeister/in) → CG-1.6.4 115 h → Rückgängig → 295 h; Formular Ziele: Code doppelt → „1 Code doppelt“; CG-Ä-2 „Beantragt von“ als Auswahl.

## Kleine Punkte (neu in V111)

- Strg/⌘+Z merkt auch Aktionen ohne Wirkung; `popSnap` überspringt gleiche Stände. Der Verlauf lebt nur im Fenster (nicht gespeichert), Abgleich von außen (`remote`) wird nicht gemerkt.
- Notizen-View: bei 2 Pads und „2 × 2“ teilen sich die zwei Pads die Fläche; Grenzen-Ziehen ist in View ≠ Dashboard aus (keine Anfasser).
- Gelöschte Person bleibt als `change.by`-Id stehen und erscheint dann als „„pn-…“ (Text)“ – beim nächsten Feinschliff in `removePerson` mitnehmen.
- „+ Bezug“-Auswahl liegt in der Zelle (nicht schwebend), weil `.dc__scroll` sonst abschneidet; sie macht die Zeile hoch.
- Testbrowser: In V111 war die Tour „Projekte“/„Formulare“ beim Öffnen bereits gesehen; die Tour „Entscheidungen“ ist auf localhost:2910 jetzt als gesehen gemerkt (`esource.tour.decisions.v1`), Rad „Punkte“ steht dort auf „Zeigen“ (`esource.decision.points.v1`).
- `tab.drag` im eingebauten Browser löst die Pointer-Gesten von E-Sources nicht aus – Ziehen nur per Hand prüfen.
- Überlauf: Die schwebende Leiste hebt solange Vorfahren mit `container-type` (z. B. `.pad` „pad“, `.win__bar` „winbar“) auf – Container-Abfragen dort gelten dann kurz nicht. Portal-Köpfe werden jetzt knapp statt umzubrechen (vorher zweizeilig bei schmalen Portalen).
- Schwebender Pad-Kopf mit mehreren Sheets nicht im Browser geprüft (Testbelegung nach Neuladen im Desk-Modus); Portal-Tabs nach unten geprüft.
- View-Bäume im Notizen-Modus (2 × 2 / 2) werden nicht gespeichert – nach Neuladen wieder halbe/viertel Fläche.
- Rad „Arbeitsweise“ steht bei schmaler Kopfleiste im Überlauf (Tests im Browser: erst „»“ öffnen).

## Commit-Text V111 (e-sources)

**Summary:** `V111: Überlauf für Leisten und Reiter, Bezüge an Lösungen, Tour Entscheidungen, Entscheidung unter Sheets, Strg+Z für Anordnungen, Notizen-Modus mit Anfassern und View, Räder mit Anschlag`

**Description:**
```
- F-222: „+ Bezug“ an Lösungen (Notiz, Source, Person, Feedback) als Chips, Ziehen zum Umsortieren, Rad „Punkte“, Tour „Entscheidungen“
- Entscheidung unter Sheets: „+ Sheet“ im Pad als Auswahl-Rad, Menü „Notizen & Aufgaben“, Cockpit „Notizen“
- F-226: Aufwand aus Einsätzen in Notiz und Sheets, Person löschen nimmt Einsätze mit, doppelte Codes, „Beantragt von“ als Person
- F-228: Überlauf für Kopfleiste, Portal-Kopf, Tabs, Pad-Kopf und Sheets – knapp mit Symbol und Zahl, dieselbe Leiste schwebt ganz (Original-Aussehen, deckend, bleibt im Bild; Reiter als Liste nach unten; beim Hovern Leuchtrahmen und Rest abgedunkelt)
- Karten: Erledigt-Kreis immer sichtbar, dunkles Glas
- F-229: Notizen-Modus mit sichtbaren Anfassern, View 2 × 2/2 mit Anfassern, Kante zieht die ganze Linie, Strg/⌘+Z macht Anordnungen rückgängig
- Räder mit Anschlag (Klick pendelt), Karten ohne inneren Hover-Rahmen
- F-228 Doc, Handbuch V111, Lastenheft, Tests (workspace 526, gpm 28), Übergabe V111

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q3hV8B2g5Abjn5kG7J
```
