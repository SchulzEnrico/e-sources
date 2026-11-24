# Übergabe V67 → V68 E-Sources

Stand: 24.11.2026 · Chat V67 abgeschlossen · Nächster Chat: **V68 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V68 E-Sources**. Lies diese Übergabedatei und im Lastenheft `docs/Lastenheft/Lastenheft_E-Sources.md` unter **F-206** die Abschnitte „Schritt 3 – Pads mit Notizblock und Lageplan (V66)“ und „Datenmodell (V65)“ (Bau-Reihenfolge, Schritt 3 ◐). Lies `web/src/components/Pad.tsx`, `web/src/workspace/pads.ts` und in `App.tsx` den Abschnitt „F-206 Schritt 3: Pads“ (nach `currentPanel`). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `docs/uebergaben/V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`), dazu die kleinen Punkte aus V62–V67 (V66: siehe `V66_Uebergabe_E-Sources.md`). Dann „Nächste Schritte“ ab 1.

## Links

- **Entscheidungs-Doc Schritt 3 (V66):** https://claude.ai/artifact/NMyuk8ZRU4MQ9VvUzAvgtN – P1–P9. PDF in `docs/Arbeitspakete/`.
- **Datenmodell-Doc (V65):** https://claude.ai/artifact/NpSKcDPjB3QGqmHeJrcXiU
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – nachzuziehen: Gist-Abgleich (V58/V59), Slot als Datei (F-158), Farbpipette (F-147), Notizen (F-206 V62–V67).
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources` · **Demo:** https://schulzenrico.github.io/e-sources/

## Was in V67 passiert ist

- V66 Teil 2 war schon gepusht (`5c12dd2`); Tests auf dem Mac **357 grün** (Enrico).
- **Schritt 3 Oberfläche, Teil 1 ✓** (im Testbrowser geprüft, `?test=voll`):
  - `components/Pad.tsx` (neu): Pad als eigene Ebene über den Slots (`.padlayer`, `pointer-events` nur am Pad), Kopf mit Reitern (`role=tablist`, Pfeile/Pos1/Ende, Umschalt+Pfeil verschiebt Reiter, Doppelklick = umbenennen), „+ Sheet“ (Notizblock, To-do, Kanban, Eisenhower; bei 9 gesperrt), ⋮ (Sheet umbenennen, Sheet schließen, „Platz wählen …“ gesperrt bis Lageplan, Pad schließen), × ; Kopf ziehen = verschieben, Ränder n/s/e/w + Ecke = Größe; **Mindestgröße 260 × 200 px gilt auch beim Zeigen** (Pad wird nie kleiner dargestellt, auch nach kleinerem Fenster). Aktives Pad = oben mit Akzentrahmen; Stapel über `z-index`, DOM-Reihenfolge fest (Fokus geht beim Nach-oben-Holen nicht verloren). Region „Pad: Notizblock – oben links“. Tastatur im Pad: **Alt+Pfeil verschiebt (2 %), Alt+Umschalt+Pfeil ändert die Größe**, Strg/⌘+1…9 Sheet, Esc im Kopf schließt (Fokus danach auf NewPad).
  - Notizblock: links Liste („+ Neue Note“, Titel + Zustand, erledigt durchgestrichen), rechts die Note mit dem Editor aus `NoteTab`; unter 470 px Breite (Container Query `padbody`) nur eins von beiden mit „Zur Liste“. Andere Sheet-Arten zeigen einen Platzhalter.
  - `App.tsx`: Knopf **NewPad** neben NewSlot (Menü: Neues Pad, Platz wählen … (gesperrt), Pads aus-/einblenden; ausgeblendet zeigt der Knopf die Zahl). Neues Pad über der rechten Hälfte des aktiven Slots (P2), Pads ohne Platz bekommen ihn beim ersten Zeigen fest (`padHome`, bei `from` der Slot dieses Portals). Geöffnete Note je Notizblock in `padPick` (nur Fensterzustand).
  - **Suche (P3):** `openNoteHit`/`newNoteHere` öffnen bzw. legen im Pad an (`padOpenResult` in `useWorkspace.ts`, Ids vorab erzeugt – App und Reducer rechnen gleich, `idSeq`). Liegt eine Notiz noch in einem alten Notiz-Tab, springt die Suche weiter dorthin (bis zum Umstieg). Search.tsx zeigt „Pad“ bzw. „Pad (Notizblock) · schon offen“ (`padShowing`).
  - **Abweichung von P3 (bitte bestätigen):** Gibt es auf dem Desk **kein** Pad, öffnet eine Note aus der Suche ihren **eigenen geschlossenen Notizblock** wieder (statt jedes Mal „Notizblock 2, 3 …“ anzulegen). Mit Pad bleibt es wie entschieden (Notizblock des obersten Pads).
  - **Deckkraft (Wunsch Enrico, V67):** Pads und Dock getrennt einstellbar (`esource.padOpacity`, `esource.dockOpacity` in `display.ts`, je Browser, 20–100 % in 5er-Schritten, Grundeinstellung 100). **Schieberegler** `OpacitySlider` (in `Pad.tsx` exportiert, `li.menu__range` im Menü – Pfeiltasten bleiben beim Regler): im ⋮ jedes Pads (Pads) und im NewPad-Menü (Pads + Dock). CSS-Variablen `--pad-opacity` / `--dock-opacity` am `.app`; Hover, Fokus im Pad und Ziehen = ganz undurchsichtig; erzwungene Farben immer undurchsichtig. **Beim Bau des Docks (Schritt 4):** Regler `OpacitySlider` mit `opacityDock`/`setDockOpacity` am Dock anbringen und `opacity: var(--dock-opacity)` mit denselben Ausnahmen setzen. Im Testbrowser geprüft.
  - Neue Aktionen im Reducer: `padNew, padPlace, padRaise, padShow, padAddSheet, padMoveSheet, padCloseSheet, padClose, padRenameSheet, padNote, padOpen, padCreate`.
  - Texte: `PAD_TEXT`, `TERMS.pad/sheet/notepad` (terms.ts); Symbole `pad`, `newPad` (icons.ts); CSS am Ende von `App.css`.
- Tests: **358 grün** in Claudes VM (neu: geschlossener Notizblock wird wieder geöffnet, `padShowing`) – auf dem Mac noch prüfen.

## Frage an Enrico

- **Deckkraft je Pad?** Gebaut: ein Wert für alle Pads, ein eigener für das Dock (Regler in jedem Pad stellt alle Pads). Soll jedes Pad eine eigene Deckkraft haben können?

- **P7 Tastatur:** Im Doc steht „Alt + Pfeil verschieben (2 %, mit Umschalt 10 %)“ **und** „Alt + Umschalt + Pfeil Größe“ – das schließt sich aus. Gebaut: Alt+Umschalt+Pfeil = **Größe** (je 2 %). Soll es einen großen Schritt (10 %) geben, z. B. mit Alt+Strg/⌘+Pfeil?

- **Neu (Wunsch Enrico, 13:04): F-212 Transparenz für Pads und Dock** – im Lastenheft mit Vorschlag; Fragen siehe unten im Chat-Ende bzw. hier: global je Desk oder je Pad oder beides? Beim Zeigen/Fokus ganz deckend? Danach bauen (klein, gut nach dem Umstieg oder gleich als Nächstes).

## Nächste Schritte

1. **Commit** (Enrico, Text unten), Tests auf dem Mac (`npm test` → 358), PO. Kurz selbst ausprobieren: NewPad › Neues Pad, Note schreiben, Pad ziehen/größer machen, schließen, Note über die Suche wiederfinden.
2. Schritt 3 weiter (Reihenfolge P9):
   1. **Umstieg einhängen** (P5): `migrateNoteTabs` beim Laden (in `parseWorkspace`; auch `deskLayouts[].saved.panels`, `closed`, Slot-Dateien, Sicherungen), einmaliger Hinweis „Notizen liegen jetzt in Pads über dem Desk.“ mit „Zeigen“; danach Notiz-Tab-Code entfernen (`NoteTab`-Einsatz im Portal, `ViewTab`, `NewInTab`/„Neu in diesem Tab“, `Tab.note/view`, `openNoteIn`, `leaveTab`, `dropIfEmpty`, Aktionen `openNote/newNote/tabNote/tabLeave`, `tabShowing`-Zweige in App/Search; `notesForPanels` → Pads der Portale, Klärung D). `NoteTab` selbst bleibt (Editor im Notizblock) – evtl. umbenennen in `NoteCard`.
   2. Tastatur P7 Rest: F6 reihum Kopfleiste → Slots → Pads; Strg+ö/ä Pad wechseln.
   3. Hilfe/Begriffe: Hilfe-Einträge „Pad“, „Sheet“, „Notizblock“, „NewPad“ in help.ts mit Symbol in `HELP_ICON` (Test F-156) und Fragen; „Neue Notiz“ in Suche/Hilfe heißt jetzt im Pad „Neue Note“ – Wort vereinheitlichen (Note/Notiz).
   4. Smartphone (P8): Notes-Ansicht wie Note Mode.
   5. Lageplan (P1, Weg C) – „Platz wählen …“ freischalten; danach F-210 für NewSlot.
3. Danach Schritte 4–10 laut Lastenheft F-206.
4. Kleine Punkte (Barrierefreiheit, bei Restplatz): V61 Nr. 5, V62–V67.
5. Später: F-211, Entwicklerwerkzeuge (F-16/F-18/F-115).
6. **Spaces und Cases sowie Slot als Datei (F-158)** prüft Enrico ganz am Ende (nicht vorher fragen).

## Kleine Punkte (neu in V67)

- Deckkraft gilt für „ruhende“ Pads – auch das oberste (aktive) Pad wird durchsichtig, solange Maus und Fokus woanders sind. Falls das aktive Pad immer deckend sein soll: in `App.css` `.pad.is-top` zur Regel mit `opacity: 1` nehmen.
- Pad-Plätze sind Anteile der Desk-Fläche; ein Pad über einem Slot bleibt beim Umbau des Layouts liegen, wo es war (gewollt: „verschiebt Portale nicht“). Beim Lageplan ggf. „an Slot heften“ überlegen.
- Mit der Maus im Testbrowser lassen sich Pad-Ränder schlecht treffen (verkleinerte Ansicht); geprüft mit nachgestellten `PointerEvent`s auf `.pad__grip--se/--w` und `.pad__icon` (window-Listener für move/up). Ziehen mit echter Maus bitte auf dem Mac prüfen.
- `padsHidden` und `padPick` sind nur Fensterzustand (nach Neuladen sind Pads wieder sichtbar, keine Note gewählt).
- Ein Pad schließen merkt sich seinen Platz nicht (`closePad` → `dropPlace`); beim Wiederöffnen kommt es über den aktiven Slot.
- Pads anderer Desks (`desk` ≠ dieser) zeigt nur das Fenster dieses Desks; Suche findet „schon offen“ auch dort (`padShowing` über alle Desks) – Springen dorthin über Desks fehlt noch.
- Sheet „schließen“ über ⋮ beim letzten Sheet schließt das ganze Pad (wie Logik `takeOut`).
- Aus V66 weiter offen: `deleteView` nimmt Sheets nicht aus Pads; Slot-Datei nimmt Pads nicht mit; `GIST_NEWER` „Neu laden“.

## Commit-Text V67

**Repo e-sources – Summary:** `V67: Pads mit Notizblock, Knopf NewPad, Deckkraft, Suche öffnet im Pad (F-206 Schritt 3)`

**Description:**
```
- Pad als schwebendes Fenster über den Slots (components/Pad.tsx):
  Sheets als Reiter, + Sheet, Menü, ziehen und Größe ändern
  (mindestens 260 × 200 px), aktives Pad oben, Tastatur (Alt+Pfeile,
  Strg+1…9, Esc), Bereich mit Lage für Bildschirmleser
- Notizblock: Liste der Notes und geöffnete Note, schmal eins von beiden
- Knopf NewPad neben NewSlot: neues Pad, Pads aus-/einblenden,
  Deckkraft für Pads und Dock getrennt, Schieberegler im Pad-Menü
  (bei Hover und Fokus undurchsichtig)
- Suche öffnet Notes und Sheets im Pad und zeigt „schon offen“;
  ohne Pad öffnet eine Note ihren eigenen Notizblock wieder
- Lastenheft F-206 Stand, neu F-212 Transparenz für Pads und Dock,
  Übergabe V67
- Tests 358 grün
```
