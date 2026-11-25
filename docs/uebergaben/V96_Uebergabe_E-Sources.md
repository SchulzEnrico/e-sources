# Übergabe V96 → V97 E-Sources

Stand: 25.11.2026 · Chat V96 abgeschlossen · Nächster Chat: **V97 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V97 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 Schritt 8** („Gebaut V96“, „Entschieden V96“) und **F-207**. Entscheidungs-Doc: „F-206 V96 – Main Stage, Library-Umschalter (Schritt 9) und Projekt-Desk oder Projekt-Modus (Schritt 10)“ (https://claude.ai/artifact/B8bKXzxLhqACZrJ2T1gmgE, PDF `docs/Arbeitspakete/F-206_V96_MainStage_Library_ProjektModus.pdf`) – **Enrico: „Wir halten uns an deine Vorschläge“ = alle Vorschläge gelten.** Leitlinien: **Trello** für Karte und Board, **IPMA ICB4** und **MS Project / iTaskX** für den ganzen Bereich Projekte, Design und Anordnung an unsere Anwendung angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V96_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V96 passiert ist

`npx tsc --noEmit -p .` sauber. Tests mit `vitest-ersatz.js`: workspace 463, persons 16, stage 3 (neu), noteSources 1 – alle grün. **Enrico bitte `npm test` in `web/`** (neue Datei `stage.test.ts`). Im Browser noch nicht angesehen (Prüfung gesammelt).

1. **Schritt 8 Bau 7 – Fokus-Ring und Auslastungs-Raster** (`components/FocusCockpit.tsx`, Logik `focusLoad.ts`):
   - Zeile **„Zeigen“** im Cockpit „Fokus“: Fokus-Zeile · Wochenbalken · Fokus-Ring · Auslastungs-Raster, ein-/ausschaltbar und kombinierbar (`Workspace.focusViews`, fehlt = alle; eine Wochen-Darstellung bleibt immer an, Meldung am Ort). Fokus-Zeile im Desk-Kopf lässt sich damit ausblenden.
   - **Fokus-Ring** (`ringOf`): gewählte Woche als Füllstand, voller Kreis = Kapazität, Überlast als roter äußerer Bogen; Team je Mitglied in Kennfarbe.
   - **Auslastungs-Raster** (`gridOf`) wie „Ressource: Einsatz“: Personen × 6 Wochen, Zelle im Ton, „Summe“ unten; Team = Mitglieder + Team gesamt. Klick/Enter wählt Person + Woche; Tastatur als Raster.
   - Hilfe „Projektfokus“ ergänzt.
2. **Entscheidungs-Doc Schritt 9 und 10** angelegt, PDF in `docs/Arbeitspakete/` abgelegt; Antworten im Lastenheft (S1, M1–M9, L1–L4, B1 erledigt, J1 = D3: erst **Projekt-Modus** im Rad Desk · Notizen · Projekte, dann **Projekt-Desk**; J2–J12).
3. **Schritt 9 Bau 1 – Main Stage Logik** `workspace/stage.ts` mit Tests; Aktionen `stageSet`, `stageEdit`, `stageRestore` im Reducer. Noch keine Oberfläche.
4. Kleiner Punkt V95: Hinweis „keine Befugnis“ im Kanban schließt jetzt mit **„OK“** statt „Abbrechen“ (`KANBAN_TEXT.noRightOk`).

## Nächste Schritte

1. **Schritt 9 Bau 2:** Scheinwerfer-Knopf im Portal-Kopf (sichtbar wenn Stage, sonst bei Hover/Fokus; Symbol `spotlight` in icons.ts neu), Eintrag „Auf die Main Stage“ im ⋮ des Portals, im Cockpit „Portale“ Taste S; neue Stage löst alte ab mit „Rückgängig“ am Ort. Lichtkegel oben am Portal in Akzentfarbe + Wort für Bildschirmleser, auch im Radar (M7). Nur Desk-Modus (M9).
2. **Bau 3:** „Main Stage …“ am Ort (Klick auf den Scheinwerfer): Fest im Layout (Umschalt-Rad) · Mindestgröße (B × H px, Vorschlag aus heutiger Größe) · Auf allen Desks (gesperrt, Grund „kommt in Stufe 2“). Fest sperrt Verschieben/Tauschen/Schließen der Stage (Grund im Tooltip), Größe nur bis Mindestgröße (`stageLocks`, `clampToMin`).
3. **Bau 4:** Pads/Dock/Lageplan: `avoidStage` beim Ablegen, Anlegen und Lageplan; Ziehen über die Stage → Rand „hier nicht“, Pad springt zurück; Dock drängt nur andere Slots zurück; `dropStaleStage` beim Schließen/Laden; Q5 Notiz ↔ Quelle öffnet in der Stage (Hinweis in `App.tsx` um Zeile 2072).
4. **Bau 5:** Library-Rad „Sources · Notizen“ (Portal-Library + Cockpit „Library“, Wahl je Portal/Gerät gemerkt). **Bau 6:** Hilfe, Begriffe (`TERMS.mainStage`).
5. Danach Touren F-217 → **Schritt 10** nach J12: Projekt-Modus + Projektliste + Steckbrief → PSP → Gantt mit Vorgängern → Meilensteine → Basisplan → Netzplan → Ressourcen je Projekt (Task-Limit je Projekt) → Bericht → Projekt-Desk. Portfolio „Aktuelles“ nachziehen (seit V83).
6. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V95 plus:
   - `npm test` in `web/`.
   - Cockpit „Notizen“ › „Fokus“: Zeile „Zeigen“ – jede Darstellung aus/an; letzte Wochen-Darstellung lässt sich nicht ausschalten (Meldung); Fokus-Zeile aus → verschwindet im Desk-Kopf.
   - Fokus-Ring: Woche wählen (Balken oder Raster) → Ring folgt; Überlast > 100 % zeigt roten Außenbogen und „+n h über“; Team zeigt Mitgliederfarben.
   - Auslastungs-Raster: Zeilen ich/Personen/Rollen + Summe; Team gewählt → Mitglieder + „Team (gesamt)“; Töne gelb/rot; Pfeile, Pos1/Ende, Strg+Pos1/Ende, Enter springt in die Aufgaben; Klick wechselt Person.
   - Kanban ohne Befugnis „Abnehmen“: Hinweis schließt mit „OK“.
   - Light Mode und schmales Cockpit (< 760 px: Ring über den Balken).

## Kleine Punkte (neu in V96)

- Das Raster rechnet jede Person einzeln mit `loadOf` – bei sehr vielen Personen ggf. zwischenspeichern (`useMemo`).
- Summenzeile im Raster ist nicht wählbar als „Person“ (Klick wählt nur die Woche).
- Ring zeigt bei „Ohne Termin“ die erste Woche des Zeitraums.
- Zeile „Zeigen“ nutzt Umschalt-Knöpfe (aria-pressed) statt Umschalt-Rad, weil die Darstellungen kombinierbar sind (kein Modus) – beim Prüfen ansehen, ob das so passt.
- `avoidStage` arbeitet in Anteilen der Desk-Fläche; die Mindestgröße der Stage ist in px (`clampToMin`) – beim Einbau in die Größen-Logik umrechnen.

## Commit-Text V96

**Summary:** `V96: F-206 Schritt 8 Bau 7 – Fokus-Ring, Auslastungs-Raster, Darstellungen wählbar; Schritt 9/10 entschieden, Main Stage Logik`

**Description:**
```
- Cockpit „Fokus“: Zeile „Zeigen“ (Fokus-Zeile, Wochenbalken,
  Fokus-Ring, Auslastungs-Raster) kombinierbar, gespeichert in
  focusViews; Fokus-Zeile im Desk-Kopf ausblendbar
- Fokus-Ring: Woche als Füllstand, Überlast als Außenbogen,
  Team je Mitglied
- Auslastungs-Raster nach MS Project/iTaskX: Personen × Wochen im
  Ton, Summe, Team mit Mitgliedern; Tastatur als Raster
- Logik focusViewsOf/setFocusView, ringOf, gridOf mit Tests
- Entscheidungs-Doc Schritt 9 (Main Stage, Library-Umschalter) und
  Schritt 10 (erst Projekt-Modus, dann Projekt-Desk), PDF in
  docs/Arbeitspakete; Antworten im Lastenheft
- F-207 Main Stage: Logik stage.ts mit Tests, Aktionen stageSet,
  stageEdit, stageRestore
- Kanban: Hinweis ohne Befugnis schließt mit „OK“
- Hilfe „Projektfokus“, Lastenheft, Übergabe V96
```
