# Übergabe V68 → V69 E-Sources

Stand: 24.11.2026 · Chat V68 abgeschlossen · Nächster Chat: **V69 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V69 E-Sources**. Lies diese Übergabedatei, dann `V67_Uebergabe_E-Sources.md` (Abschnitte „Nächste Schritte“ und „Kleine Punkte“ – gelten weiter, soweit hier nicht erledigt) und im Lastenheft `docs/Lastenheft/Lastenheft_E-Sources.md` **F-206** (Schritt 3), **F-212**, **F-213**, **F-214**. Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`). Lies `web/src/components/Pad.tsx`, `web/src/components/NoteTab.tsx` und in `web/src/workspace/notes.ts` den Abschnitt „F-213 (V68): Entwurf“. Dann „Nächste Schritte“ ab 1.

## Links

- **Entscheidungs-Doc F-213 (V68):** https://claude.ai/artifact/9JmFu92yyDGVNXNwHH4rbt – S1–S10, alle beantwortet. PDF in `docs/Arbeitspakete/`.
- **Entscheidungs-Doc Schritt 3 (V66):** https://claude.ai/artifact/NMyuk8ZRU4MQ9VvUzAvgtN
- **Datenmodell-Doc (V65):** https://claude.ai/artifact/NpSKcDPjB3QGqmHeJrcXiU
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – nachzuziehen: Gist-Abgleich (V58/V59), Slot als Datei (F-158), Farbpipette (F-147), Notizen und Pads (F-206 V62–V68), Entwurf (F-213).
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources` · **Demo:** https://schulzenrico.github.io/e-sources/

## Was in V68 passiert ist

- V67 war gepusht, Tests auf dem Mac 358 grün. V68 Teil 1 committet und gepusht (`4100df1`).
- **Antworten Enrico auf die V67-Fragen:**
  - Großer Schritt mit Alt+Strg/⌘+Pfeil geht nicht (Browser wechselt den Tab) → **gedrückt halten = 6 % je Wiederholung** (Alt+Pfeil, auch Alt+Umschalt+Pfeil für die Größe). `STEP_HOLD` in `Pad.tsx`.
  - Suche ohne Pad öffnet den eigenen Notizblock wieder: **vorerst ja**.
  - Aktives Pad **nicht** ganz deckend, sondern **andere Akzentuierung**: Kopf in Akzentfarbe getönt + Akzentlinie, Pad-Symbol in Akzentfarbe, nur dort Akzent unter dem Reiter. Rahmen und Akzent bleiben bei jeder Deckkraft voll sichtbar (Hintergrund als `.pad::before`, Deckkraft auf `.pad > *`).
  - Deckkraft **für alle Pads gleich** (ok), aber **Regler direkt sichtbar**: `OpacityInline` im Pad-Kopf (Symbol `contrast`, unter 380 px Pad-Breite nur im ⋮), in der **Akzentfarbe** (Spur/Knopf selbst gestaltet, auch Safari; Menü-Regler gleich). Beim Einstellen zeigt die Fläche die Wirkung (`:has(... input:focus/active)`).
- **Gestaltung Pad (Wunsch Enrico):** Notizfläche versenkt (`--pressed`), Schrift leicht erhaben (`--pad-emboss`, je Theme), Notizfeld im Pad heller (`.pad .nedit`), Trennlinie Liste | Note silbrige **Haarlinie 0,5 px** (`border-image`).
- **F-213 Speichern, Verwerfen, Schließen ✓ (von Enrico geprüft):** Option C mit S10 – Entwurf liegt an der Note (`Note.draft`, `Note.unsaved`), Leiste unten mit Status, Speichern (**Strg/⌘+S** – Abweichung von S6, da Strg/⌘+Enter im Editor Aufgaben abhakt; Enrico noch kurz bestätigen lassen), Verwerfen (mit Rückgängig), Schließen (Esc, Rückfrage **in der Leiste**). Details im Lastenheft F-213.
- **F-214 Meldungen am Ort des Geschehens (neu, „#perfekte Fokussierung“):** im Notizblock gebaut (Statuszeile der Note bzw. oben in der Liste, mit Rückgängig; `Notice` in `NoteTab.tsx`, Zustand in `NoteBlock`). Rest der App offen → vor dem Bauen Claude Doc.
- Tests: **363 grün** in Claudes VM (5 neue für F-213).

## Neue Wünsche Enrico (13:57) – im V69 zuerst angehen

- **A. Pad-Rahmen mindestens halb so breit** (Design, klein): gemeint ist der Rand um die versenkte Notizfläche – heute `.pad__body { margin: 0 6px 6px }` plus 1 px Rahmen des Pads → z. B. 2–3 px Abstand; Ränder zum Ziehen der Größe (`.pad__grip`, 5–6 px) bleiben greifbar (dürfen über dem Inhalt liegen). Vorher am Bildschirmfoto mit Enrico klären, ob auch die Kopfleiste/der Außenrahmen gemeint ist.
- **B. F-215 Fußleiste mit Home-Knopf** (Grundsatzfrage → **Claude Doc an der Seite** vor dem Bauen, PDF nach `docs/Arbeitspakete/`): Fußleiste unten im Pad, in der Mitte ein runder Knopf **im Stil des alten Apple-Home-Buttons** (eigene Gestaltung: Kreis mit eingelassenem abgerundetem Quadrat, keine Apple-Marke/kein Logo). **Multifunktionsknopf:** Drücken und halten = **Notiz per Sprache aufnehmen**, **nach oben wischen = Aufnahme feststellen** (wie die Sprachnachricht in Messenger-Apps). Claude schlägt weitere Belegungen vor, angelehnt an bekannte Home-Button-Gesten: einmal drücken = Home (z. B. zurück zur Liste / zum Notizblock-Start), zweimal = Ansicht wechseln bzw. zuletzt genutzte Sheets (wie App-Umschalter), dreimal = Kurzbefehl (z. B. Bedienungshilfen, Deckkraft 100 %), lang halten = Sprache (wie Siri), Ruhe-/leichtes Antippen = „Reachability“-ähnlich (Pad in Reichweite holen), Fingerabdruck → hier evtl. „bestätigen/speichern“. Im Doc klären: welche Gesten, Tastatur-Gegenstück für alles (NF-03: Fokus auf Knopf, Leertaste = drücken, Leertaste halten = Aufnahme, Pfeil hoch = feststellen; sichtbare Beschriftung/Tooltip, Begriffe erklären), Bildschirmleser-Ansagen, Spracherkennung (Web Speech API: geht je nach Browser an Google/Apple/Microsoft – nur nach Einschalten, Hinweis Datenschutz; Firefox ohne → Rückfall Audioaufnahme als Anhang?), Rückmeldung am Ort (F-214), Smartphone (P8), Platz der Fußleiste (Status/Speichern-Leiste von F-213 dort integrieren?), auch für Dock/Board.

## Nächste Schritte

1. **Commit** (Enrico, Text unten), Tests auf dem Mac (`npm test` → 363). Kurz prüfen: Meldung „Note gespeichert.“ / „Änderungen verworfen.“ erscheint jetzt **in der Note** (Statuszeile unten) mit „Rückgängig“; neue Note verwerfen → Meldung oben in der Liste. Strg/⌘+S bestätigen lassen.
2. **F-214 Grundsatz:** Claude Doc an der Seite (alle `flash`-Stellen auflisten mit Vorschlag für den Ort, Meldungen ohne Ort, gemeinsames Bauteil, Barrierefreiheit), PDF nach `docs/Arbeitspakete/`. Nach Enricos Antworten bauen. (Reihenfolge mit Schritt 3 mit Enrico abstimmen – Funktion vor Design.)
3. Schritt 3 weiter (Reihenfolge P9, siehe V67 „Nächste Schritte“ 2.1–2.5): **Umstieg einhängen (P5)** – dabei beachten: Notizen aus alten Notiz-Tabs werden zu gespeicherten Notes (kein Entwurf); danach `NoteTab` ohne `draft`-Zweig vereinfachen (Entwurf immer an) und evtl. in `NoteCard` umbenennen. Dann Tastatur P7 Rest, Hilfe/Begriffe (auch „Entwurf“, „Speichern“ in help.ts), Smartphone (P8), Lageplan (P1).
4. Danach Schritte 4–10 laut Lastenheft F-206. **Dock (Schritt 4):** sichtbarer Deckkraft-Regler wie im Pad-Kopf (`OpacityInline` mit `dockOpacity`/`setDockOpacity`), Akzentregeln wie Pad.
5. Kleine Punkte (bei Restplatz): V61 Nr. 5, V62–V68.
6. Später: F-211, Entwicklerwerkzeuge (F-16/F-18/F-115); Projektfokus zeigt Entwürfe als „vorläufig“ (F-213 S10).
7. **Spaces und Cases sowie Slot als Datei (F-158)** prüft Enrico ganz am Ende (nicht vorher fragen).

## Kleine Punkte (neu in V68)

- Suche findet nur Gespeichertes (Entwürfe nicht) – gewollt laut Doc; ggf. später „Entwurf“ als Treffer mit Hinweis.
- `isEmptyNote`/Suche: nie gespeicherte Notes gelten als leer (gespeicherter Stand leer) – passt, solange die Suche nur Gespeichertes zeigt.
- Speichern einer leeren neuen Note ist möglich (legt eine leere Note an) – evtl. Speichern bei leerer neuer Note sperren.
- Entwurf hat keine eigene Spur (`trail`) – erst Speichern schreibt „bearbeitet“/„Zustand“. Für den Projektfokus ggf. „Entwurf angelegt von …“ (`draft.by`, `draft.at` liegen vor).
- Zwei Fenster mit derselben Note: der Entwurf ist für beide derselbe (liegt in der Library) – kein Sperren, letzter Stand gewinnt.
- „Zur Liste“ (schmales Pad) behält den Entwurf still (S8); nur „Schließen“ fragt nach.
- Hilfetext unter dem Editor nennt weiter „Strg/⌘+Enter (Aufgabe abhaken)“ – passt; Strg/⌘+S für Speichern steht im Tooltip von „Speichern“, noch nicht in der Hilfe.
- Haarlinie 0,5 px wirkt nur auf Retina als halbes Pixel; auf normalen Bildschirmen 1 px.
- Aus V67 weiter offen: siehe V67 „Kleine Punkte“ (u. a. `deleteView` nimmt Sheets nicht aus Pads, Slot-Datei nimmt Pads nicht mit, Springen zu Pads anderer Desks).

## Commit-Text V68 (Teil 2)

**Repo e-sources – Summary:** `V68: Meldungen in der Note (F-214), Rückfrage sichtbar, Strg/⌘+S, Notizfeld heller, Haarlinie`

**Description:**
```
- Meldungen im Notizblock am Ort des Geschehens: Speichern,
  Verwerfen, Löschen in der Statuszeile der Note mit „Rückgängig“;
  geschlossene Note meldet oben in der Liste (F-214, Rest folgt)
- Rückfrage beim Schließen sitzt in der Knopfleiste (war verdeckt)
- Speichern mit Strg/⌘+S (Strg/⌘+Enter hakt im Editor Aufgaben ab)
- Notizfeld im Pad heller, Trennlinie Liste | Note als silbrige
  Haarlinie
- Lastenheft F-213 ✓, neu F-214; Übergabe V68
- Tests 363 grün
```
