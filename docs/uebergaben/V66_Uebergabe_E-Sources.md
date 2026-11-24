# Übergabe V66 → V67 E-Sources

Stand: 24.11.2026 · Chat V66 abgeschlossen · Nächster Chat: **V67 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V67 E-Sources**. Lies diese Übergabedatei und im Lastenheft `docs/Lastenheft/Lastenheft_E-Sources.md` unter **F-206** die Abschnitte „Schritt 3 – Pads mit Notizblock und Lageplan (V66)“ und „Datenmodell (V65)“ (Bau-Reihenfolge, Schritt 2 ✓), dazu **F-210** und **F-211**. Lies `web/src/workspace/pads.ts` (Pad-Logik, fertig) und `noteObjects.ts`. Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `docs/uebergaben/V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`), dazu die kleinen Punkte aus V62–V66. Dann „Nächste Schritte“ ab 1.

## Links

- **Entscheidungs-Doc Schritt 3 (V66):** https://claude.ai/artifact/NMyuk8ZRU4MQ9VvUzAvgtN („E-Sources – Pads mit Notizblock und Lageplan (F-206 Schritt 3, F-210)“) – P1–P9 beantwortet (Kommentare zu P1, P6, P8). PDF in `docs/Arbeitspakete/`.
- **Datenmodell-Doc (V65):** https://claude.ai/artifact/NpSKcDPjB3QGqmHeJrcXiU
- **Entscheidungs-Doc (V64/V65):** https://claude.ai/artifact/A8Uo5rH5cRejM14FgNS9WK
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – nachzuziehen: Gist-Abgleich (V58/V59), Slot als Datei (F-158), Farbpipette (F-147), Notizen (F-206 V62–V66).
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources` · **Demo:** https://schulzenrico.github.io/e-sources/

## Was in V66 passiert ist

- V65-Commit war schon gepusht (`34b97c8`).
- **Bau-Schritt 2 ✓ – Datenmodell v8** (Commit V66 Teil 1 gepusht, Tests 352 grün auf dem Mac):
  - Speicher `esource.workspace.v8` (liest v7 … v4), `FILE_VERSION` 6, `SLOT_VERSION` 2.
  - `types.ts`: `NoteLink` = `{ id, rel: 'EA'|'AA'|'EE'|'AE', lag?, wait? }` (alt `kind: 'done'` → EA + wait, `'date'` → EA; Umwandlung in `parseLink`, notes.ts); Note neu: `type, project, assignee, effort, cost, milestone, remind, accept, sources`; `delegated.person`; Sheet (NoteView) neu: `owner, range, check, sources`, Spalte `wip`; neu `Pad, PadDesk, PadPlace, Project, Person, DeskNotes, FocusView, SourceLink, SourceSpot`; Workspace neu: `pads, padDesks, projects, persons, deskNotes, focusViews`.
  - `noteObjects.ts` (neu): Lesen/Prüfen aller neuen Teile, `personsFromDelegated` (feste Id `pn-…` aus dem Namen, gleicher Name = dieselbe Person, auf allen Geräten gleich), `cleanRefs`, `PAD_SHEETS_MAX = 9`.
  - `notes.ts`: `addLink(ws, id, pred, spec: LinkSpec)` (vorher Art als Text), `linkOf`, `shiftDay`, `NOTE_RELS`; `earliestStart`: EA = „fällig am“ + Zeitabstand, AA = „nicht beginnen vor“ + Zeitabstand; `stateOf`: „wartet darauf“ sperrt bei EA bis erledigt, bei AA bis begonnen; EE/AE sperren erst das Abhaken (kommt mit Kanban). `successorsOf` liefert `{ note, link }`. Slot-Import löst Projekt, zuständig, Person, Besitzer, Bereich.
  - `DEVICE_FIELDS = ['winSetup', 'padDesks']`.
- **Entscheidungs-Doc Schritt 3** angelegt und beantwortet (siehe Lastenheft F-206 „Schritt 3“): Lageplan Weg C (Slot + Seite), „Neues Pad“ ohne Rückfrage rechte Hälfte des aktiven Slots, Note aus Suche in Notizblock des obersten Pads, Umstieg ein Pad je Portal, **Knopf „NewPad“ neben NewSlot mit gleichem Verhalten** (Enrico: „Behandeln wie Slot“), Tastatur F6/Strg+ö/ä/Strg+1…9/Alt+Pfeil, **Smartphone: beim Öffnen einer Note in eine Notes-Ansicht wie im Note Mode** (Enrico; ändert V64 „nur Dock“).
- **Pad-Logik ohne Oberfläche ✓** (`pads.ts`, Tests 357 grün in Claudes VM – auf dem Mac noch prüfen): `createPad, addSheet` („Hierher holen“), `showSheet, moveSheet, closeSheet, closePad` (leere Sheets still weg), `raisePad, topPad, padWith, setPlace, placeOf, zonePlace` (Zonen top/bottom/left/right/full), `openNoteInPad, openSheetInPad` (P3), `migrateNoteTabs` (P5; `Pad.from` = Portal für den ersten Platz). **Umstieg noch nicht eingehängt** – Notiz-Tabs laufen bis zur Pad-Oberfläche weiter.
- **Neu im Lastenheft:** F-210 NewSlot mit Lageplan (auch Pads/Dock; Lageplan nach den Pads bauen, ein Baustein), F-211 QR-Code auf PDF-Ausdrucken (Deep Link zum Vorgang; setzt Rechte/Rollen/Befugnisse intern und extern voraus, hängt an F-81).
- Technik wie V65: Tests nur auf dem Mac (`npm test` in `web/`); in Claudes VM Ersatzlauf mit `docs/uebergaben/vitest-ersatz.js`. Im Test ist `Pa` schon Pause – Pads heißen dort `Pd`.
- Zwischenablagen `~/Projects/_to_delete/v66_v8tests.ts.txt` und `v66_padtests.ts.txt` kann Enrico löschen.

## Nächste Schritte

1. **Commit** (Enrico, Text unten), Tests auf dem Mac (`npm test` → 357), PO.
2. **Schritt 3 Oberfläche** (Reihenfolge P9: Pad + Notizblock + Umstieg, dann Lageplan):
   1. Komponente `Pad` (eigene Ebene über den Slots im Desk, absolut positioniert nach `placeOf`, ohne Platz: rechte Hälfte des aktiven Slots bzw. bei `from` des Slots dieses Portals → beim ersten Zeigen `setPlace`); Kopf mit Reitern, „+ Sheet“, ⋮, Schließen; Ziehen/Größe (min. 260 × 200 px); aktives Pad oben mit Akzentrahmen; region mit Namen „Pad: … – Lage“.
   2. Inhalt Notizblock: Liste der Notes + geöffnete Note – den Editor aus `NoteTab.tsx` wiederverwenden.
   3. Knopf **„NewPad“** neben NewSlot (wie NewSlot: Menü „Neues Pad“, „Platz wählen …“, „Pads aus-/einblenden“).
   4. Suche: Notes/Sheets über `openNoteInPad`/`openSheetInPad` statt `openNoteIn`; „Neue Note“ im Notizblock des obersten Pads.
   5. Umstieg einhängen: `migrateNoteTabs` beim Laden (in `parseWorkspace` nach dem Lesen; Achtung auch gespeicherte Desk-Layouts `deskLayouts[].saved.panels` und `closed` mit Notiz-Tabs, Slot-Dateien und Sicherungen), einmaliger Hinweis „Notizen liegen jetzt in Pads über dem Desk.“ mit „Zeigen“; danach Notiz-Tab-Code entfernen (`NoteTab`, „Zurück zur Auswahl“, `Tab.note/view`, `openNoteIn`, `leaveTab`, `dropIfEmpty`, `notesForPanels` → Pads der Portale?).
   6. Tastatur (P7), Begriffe/Hilfe (Pad, Sheet, Notizblock, Lageplan in terms.ts/help.ts mit Symbol).
   7. Smartphone (P8): Notes-Ansicht wie Note Mode (Pads statt Portale, Knopf zurück).
   8. Lageplan (P1, Weg C) als eigener Baustein – danach F-210 für NewSlot.
3. Danach Schritte 4–10 laut Lastenheft F-206.
4. Kleine Punkte (Barrierefreiheit, bei Restplatz): V61 Nr. 5, V62–V65.
5. Später: F-211 (Doc zum Rechte-Modell), Entwicklerwerkzeuge (F-16/F-18/F-115).
6. **Spaces und Cases sowie Slot als Datei (F-158)** prüft Enrico ganz am Ende (nicht vorher fragen).

## Kleine Punkte (neu in V66)

- Pads und Slot-Datei: Mit dem Umstieg nimmt die Slot-Datei Notiz-Tabs nicht mehr mit (`notesForPanels` liest Tabs). Klären/umbauen: Pads, deren `from` oder Platz zum Slot gehört, mitnehmen (Frage „verknüpfte Notes auf Wunsch mitnehmen“, Klärung D).
- `deleteView` nimmt das Sheet noch nicht aus Pads (beim Laden bereinigt `parsePads`); beim Bau der Oberfläche mitziehen.
- `GIST_NEWER`: Knopf „Neu laden“ neben der Meldung (aus V65, offen).

## Commit-Text V66 (Teil 2)

**Repo e-sources – Summary:** `V66: Pad-Logik (F-206 Schritt 3), Entscheidungen Pads/Lageplan, F-211, Übergabe V66`

**Description:**
```
- pads.ts: Pads anlegen, Sheets als Reiter (bis 9, jedes Sheet an
  einem Ort), schließen ohne Datenverlust, Plätze je Gerät, Zonen für
  den Lageplan, Note/Sheet im Pad öffnen, Umstieg der Notiz-Tabs
  (noch nicht eingehängt)
- Pad merkt das Portal für den ersten Platz (from)
- Lastenheft F-206 Schritt 3: Entscheidungen P1–P9 (Lageplan Slot und
  Seite, Knopf NewPad wie NewSlot, Smartphone wie Note Mode); neu
  F-211 QR-Code auf PDF-Ausdrucken
- Übergabe V66
- Tests 357 grün
```
