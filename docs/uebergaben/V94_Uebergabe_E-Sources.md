# Übergabe V94 → V95 E-Sources

Stand: 25.11.2026 · Chat V94 abgeschlossen · Nächster Chat: **V95 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V95 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 Schritt 8** („Gebaut V94“). Leitlinien: **Trello** für die Bedienung auf Karte und Board, **IPMA ICB4** und **MS Project / iTaskX** für den ganzen Bereich Projekte, **Funktion vor Design**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Metall-/Glas-Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; offene kleine Punkte aus `V74_`–`V94_…` gelten weiter. **Zuerst Enricos Rückmeldung zu V93** (Desk-Design, runde Knöpfe, Smartphone-Hinweis, Notiz ↔ Quelle) einarbeiten – sie kam in V94 nicht an. Dann „Nächste Schritte“ ab 2.

## Was in V94 passiert ist

`npx tsc --noEmit -p .` sauber. Tests mit `vitest-ersatz.js`: workspace 463, persons 5, noteSources 1 – alle grün. **Enrico bitte `npm test` in `web/` laufen lassen** (neue Datei `persons.test.ts`). Im Browser noch nicht angesehen (Prüfung kommt gesammelt).

1. **Entscheidungs-Doc Schritt 8:** „F-206 V94 – Personen und Projektfokus (Schritt 8)“ https://claude.ai/artifact/WnrVCBrcyXHza7xPd3TwWJ (PDF `docs/Arbeitspakete/F-206_V94_Personen_Projektfokus.pdf`). Enrico per Kommentar: IPMA-Leitlinien beachten, **MS Project (Windows) und iTaskX (Mac)** als Vorbild für den ganzen Bereich Projekte; „Richte deine Vorschläge daran aus und dann machen wir es nach diesem Schema“ → **P1–P23 gelten** (Lastenheft F-206 Schritt 8).
2. **Bau 1 – Logik:** `workspace/persons.ts`, `workspace/focusLoad.ts`, Tests `persons.test.ts`. Person bekommt `color` und `away` (Ressourcenkalender) → **Dateiformat 9**. Zuständig und Aufwand gehören zum Entwurf (`DRAFT_FIELDS`). P6: neue Notizen bekommen „ich“ (Reducer, Liste `NEW_NOTE`), Unter-Notizen erben.
3. **Bau 2 – Notiz:** Zeile „Zuständig · Aufwand“ über „Quellen“ (`components/PersonChips.tsx`), Alt+Z, „+ ‚Name‘ anlegen“ mit „ähnlich: …“, Limit-Rückfrage am Ort, Aufwand Plan/Ist mit Schnellwahl 0,5–8 h.
4. **Bau 3 – Sheets:** `components/usePersonKeys.tsx` in To-do, Kanban, Matrix: Z / Umschalt+Z / Q, Rad „Alle · Nur meine“ im Sheet-Kopf, Kennzeichen + Aufwand in den Zeichen, Akzentkante an eigenen Karten; Matrix „Delegieren an …“ als Personenauswahl.
5. **Fix:** Hilfe „Notiz und Quelle“ hatte kein Symbol (Test F-183 rot seit V93) → `clip`.

## Nächste Schritte

1. **Rückmeldung Enrico zu V93** (siehe oben).
2. **Schritt 8 weiter:** Bau 4 Cockpit „Personen“ als Ressourcentabelle (Name, Art, Kapazität h/Woche, Abwesenheit, Befugnisse, offene Aufgaben; Werkzeuge wie Board-Vorlagen: + oben, F2, Entf mit Rückfrage „n Aufgaben“ und Rückgängig am Ort) · Bau 5 Fokus-Zeile im Desk-Kopf (`focusLine`, Klick öffnet Fokus) und Cockpit „Notizen“ mit Rad **Notizen · Fokus · Regeln**, Wochenbalken 6 Wochen mit Kapazitätslinie, Auswahl Person/Team, Schalter „vorläufig“ · Bau 6 L2 (`hasRight(…,'accept')` bei „Abnahme bestätigen“), Hilfe „Personen und Fokus“, Begriffe in `TERMS` · Bau 7 Fokus-Ring und Auslastungs-Raster.
3. Danach Schritt 9 (Board, Main Stage F-207, Library-Umschalter) → Touren F-217 → Schritt 10 Projekte mit eigenem Entscheidungs-Doc (P23: PSP, Gantt, Netzplan, Meilensteine, Basisplan, Bericht nach ICB4 und MS Project/iTaskX). Portfolio „Aktuelles“ nachziehen (seit V83).
4. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V93 plus:
   - `npm test` in `web/`.
   - Notiz öffnen: Zeile „Zuständig“ zeigt „Name (ich)“ bei neuer Notiz; Alt+Z, Person suchen, „+ ‚Anna‘ anlegen“, Tippfehler „Ana“ → „ähnlich: Anna“; „Ohne Zuständig“; Aufwand: Plan eintippen bzw. Schnellwahl, Ist; Verwerfen setzt beides zurück (Entwurf).
   - Kanban/To-do/Matrix: Kennzeichen und „3 h“ auf Karte/Zeile; Z öffnet Auswahl an der Karte, Umschalt+Z trägt mich ein/aus, Q bzw. Rad „Nur meine“; Akzentkante an eigenen Karten; Matrix „Delegieren an …“ wählt Person, Zeichen „delegiert“.
   - Abgleich zweier Geräte (Dateiformat 9): ältere App lehnt den Stand ab, statt Personenfelder zu verlieren.

## Kleine Punkte (neu in V94)

- Personen-Auswahl liegt als `srcpick` (wie „+ Quelle“) an der Karte; in sehr schmalen Spalten kann sie überstehen – beim Prüfen ansehen.
- Ohne Profilname heißt „ich“ „Ich“; die Kennfarbe kommt immer aus dem Profil.
- Zuweisen in Sheets wirkt sofort (wie Ziehen), in der Notiz über den Entwurf.
- `M.delegatePh` (Matrix) wird nicht mehr benutzt.
- Vertretung (P16) und Abwesenheit (P21) sind in der Logik fertig, aber erst mit dem Cockpit „Personen“ einstellbar.

## Commit-Text V94

**Summary:** `V94: F-206 Schritt 8 – Personen und Zuständig (Logik, Notiz, Sheets), Projektfokus-Rechnung, Dateiformat 9`

**Description:**
```
- Entscheidungs-Doc Schritt 8 (P1–P23) mit Leitlinien IPMA ICB4 und
  MS Project/iTaskX, Lastenheft F-206 Schritt 8
- persons.ts: ich aus dem Profil, anlegen/ähnlich/ändern/löschen mit
  Rückgängig, Zuständig, Delegieren, Nur meine mit Vertretung,
  Task-Limit, Befugnisse, Kapazität mit Abwesenheit und Teams
- focusLoad.ts: Auslastung je Woche (Plan-Aufwand auf Werktage verteilt,
  ohne Termin, ohne Aufwand, vorläufig), Ton ab 80 %, Fokus-Zeile
- Person mit Kennfarbe und Ressourcenkalender, Dateiformat 9
- Zuständig und Aufwand im Entwurf; neue Notizen: ich zuständig
- Notiz: Zeile „Zuständig · Aufwand“ (Alt+Z, Person anlegen, Limit-Frage)
- To-do, Kanban, Matrix: Kennzeichen, Z/Umschalt+Z/Q, Rad „Alle · Nur
  meine“, Akzentkante; Matrix „Delegieren an …“ als Personenauswahl
- Hilfe-Symbol „Notiz und Quelle“; Tests persons.test.ts; Übergabe V94
```
