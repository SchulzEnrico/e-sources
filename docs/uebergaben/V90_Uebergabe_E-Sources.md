# Übergabe V90 → V91 E-Sources

Stand: 25.11.2026 · Chat V90 abgeschlossen · Nächster Chat: **V91 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V91 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-210** (Abschnitte „Entschieden V89“, „Gebaut V89“, „Gebaut V90“), **F-218**, **F-219** und **NF-08**. Entscheidungen: Claude Doc „F-210 V89 – Lageplan, freie Anordnung im Notizen-Modus, Boards auf dem Desk (BL4)“ (https://claude.ai/artifact/23Pr1XqchRFBJmTYutYxas, PDF `docs/Arbeitspakete/F-210_V89_Lageplan_Notizen-Layouts.pdf`) – alle Fragen = Vorschlag. Regeln: Claude Doc „V89 – Weitere Regeln im Cockpit „Regeln““ (https://claude.ai/artifact/NuZMcqza3JXxHRbLyR6WWx) – **RG1–RG8 sind entschieden** (Lastenheft F-218: „Hier folgen wir deinen Vorschlägen“). Leitlinie: **an Trello und unserer UX/UI ausrichten**, **Funktion vor Design**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`; offene kleine Punkte aus `V74_`–`V90_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V90 passiert ist

Tests **448 grün** (V89: 443). `npx tsc --noEmit -p .` sauber. Im eingebauten Browser geprüft (`localhost:2910/?test=voll`, 1600 × 950), keine Fehler in der Konsole.

1. **F-210 Schritt 4 – Notizen-Modus als Baum (F1–F5)** – neu `workspace/noteTree.ts` (Tests): `gridTree` (Startbaum = altes Raster), `syncNoteTree` (Anzeige-Baum: geschlossene Pads heraus, fehlende rechts neben das zuletzt aktive bzw. Hälfte des größten), `placeNew`, `prune`, `setNoteTree`, `noteTilesOf`, `swapToward`, `moveInTree`, `addInTree`, `equalNotes`. Baum in `PadDesk.notes` (geräteeigen, `parsePadDesks` prüft Pads und doppelte Blätter), Aktion `noteTree`.
2. **Pad** (`components/Pad.tsx`): Prop `tile` (Griffe nur an Grenzen, Kopf ziehen, Alt+Pfeil tauschen, Alt+Umschalt+Pfeil Grenze) und `onClosed` (Rückgängig am Ort). Typen `Edge`, `PadSide` exportiert.
3. **App**: Block „F-210 Schritt 4 (V90)“ vor `padLayer` – `noteTree`/`noteDraft`, `startNoteResize`, `startNoteDrag` + `noteHit` (Ziel `.notedrop`, Schild `.ghost`), `noteSwap`, `noteEdge` (über `sizeStep`), `evenNotes` (Knopf „Gleich verteilen“ und Alt+G im Notizen-Modus), `notesPlan` (Lageplan `notes`/`notesMove`), `newNoteAt`, `moveNoteTo`, `padGone` (Chip `.padgone` „Pad geschlossen · Rückgängig“, 6 s). CSS-Block „V90 (F-210 Schritt 4)“ am Ende von `App.css`.
4. **Lageplan**: `PlanKind` + `notesMove` (Mitte = tauschen); „Platz wählen …“ im Notizen-Modus freigeschaltet (Menü Notizen & Aufgaben und ⋮ des Pads). Texte `NOTES_TREE_TEXT`, `PLAN_TEXT.notesSwap/notesSelf/notesSmall/menuNotesHint/notesMoveHint`, `PAD_TEXT.moveTile/border`.
5. **Hilfe/Begriffe/Cockpit**: Hilfe „Lageplan“ neu (`HELP_ICON.sitePlan`), „Desk oder Notizen“ ergänzt, `TERMS.sitePlan` als Tooltip am Plan; Cockpit „Notizen“ zeigt Desks im Notizen-Modus wie den Baum (liest `loadModes()`), ohne Dock-Streifen.
6. Lastenheft F-210 „Gebaut V90“, Stand-Zeile ergänzt.
7. **Rückmeldung Enrico (nach dem ersten Stand, umgesetzt):** Cockpit öffnet im Notizen-Modus gleich in „Notizen“ (`notesModeRef` in `toggleOverview`); Cockpit „Notizen“ bekommt im Kopf links gleich nach dem Rad (Wunsch Enrico) die Gruppe „Neu anlegen“ (Neues Pad · Neue To-do-Liste · Neues Kanban-Board · Eisenhower-Matrix, Prop `onNotesNew` an `Overview`, `newPad(false)`/`newNoteHere(kind, undefined, false)` ohne Fokus-Sprung und ohne Meldung unten – Ansage im Cockpit). Im Browser geprüft.
8. **Rückmeldung Enrico, offen (siehe Nächste Schritte 1 und 2):** „Bei Layouts im Cockpit gibt es noch keine Einstellungsmöglichkeiten für den Note Mode“ = Notizen-Layouts Z1–Z4; „Das Layout des Desk Mode ist noch nicht angepasst“ = F-219 (Desk im Design der Notizen) – zu Beginn kurz bestätigen lassen, dass F-219 gemeint ist.

## Nächste Schritte

1. **F-210 Schritt 5 – Notizen-Layouts (Z1–Z4)** (Enrico V90: „Bei Layouts im Cockpit gibt es noch keine Einstellungsmöglichkeiten für den Note Mode“): Datenmodell in `deskNotes[desk].board` (Anordnung = Baum aus `noteTree.ts` + Pads mit Sheets, wie Desk-Layouts; je Bildschirm-Einstellung, Wechsel legt Pads in den Vorrat F-50), **Dateiformat 7 → 8**, Gruppe im Cockpit „Layouts“ zwischen Desk-Layouts und Board-Vorlagen (Werkzeuge wie Desk-Layouts, `components/DeskLayouts.tsx` als Vorbild), Layout-Menü im Kopf wählt sie im Notizen-Modus, mitgeliefert „Fokus“ und „Tagesplanung“. Vorher prüfen: Der Baum liegt heute geräteeigen in `padDesks[desk].notes` – beim Umzug in die Layouts dorthin übernehmen (Umwandlung beim Laden).
2. **F-218 Regeln** (entschieden RG1–RG8): Bereich A1–A9 als Schalter, zuerst W1–W4, Gruppen-Rad Portale · Notizen · Anzeige, Regeln auch über Cockpit „Notizen“, Spur je Regel. Bauen vor Schritt 6.
3. **F-219 Design** (Enrico V90: „Das Layout des Desk Mode ist noch nicht angepasst“ – Enrico möchte das bald) – Portale im Look der Pads, dunkle Grundfarbe bleibt, auch Light Mode; zuerst an einem Slot Vorher/Nachher (Bildschirmfoto) zeigen, dann übertragen.
4. Danach (N13): Notiz ↔ Quelle (Schritt 6) → Personen + Projektfokus (8) → Rest Schritt 9 → Touren (F-217). Portfolio „Aktuelles“ nachziehen (seit V83).
5. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V89 plus:
   - Notizen-Modus: neues Pad (Menü) kommt rechts neben das aktive; Grenze zwischen zwei Pads ziehen; Pad-Kopf auf ein anderes Pad ziehen (Rand = daneben, Mitte = tauschen, ganz an den Desk-Rand = Zeile/Spalte über die ganze Fläche).
   - Tastatur im Pad: Alt/⌥ + Pfeil tauscht mit dem Nachbarn, Alt/⌥ + Umschalt + Pfeil schiebt die Grenze; „Gleich verteilen“ bzw. Alt/⌥+G.
   - Pad schließen (× oder Esc im Kopf) → „Pad geschlossen · Rückgängig“ am alten Platz → Pad kommt genau dorthin zurück (auch schwebend im Desk-Modus).
   - Notizen & Aufgaben › Platz wählen … im Notizen-Modus (Rand, Desk-Rand, Mitte = Reiter); ⋮ des Pads › Platz wählen … (Mitte = tauschen).
   - Cockpit „Notizen“ im Notizen-Modus: Radar zeigt die Pads wie auf dem Desk.
   - Im Notizen-Modus öffnet der Fokus-Knopf (bzw. Strg/⌘+.) das Cockpit gleich in „Notizen“; dort „Neu anlegen“: Neues Pad, Neue To-do-Liste, Neues Kanban-Board, Eisenhower-Matrix.

## Kleine Punkte (neu in V90)

- Der Baum liegt je Desk **und Gerät** (wie Pad-Plätze) – auf einem anderen Gerät beginnt der Notizen-Modus wieder mit dem Raster, bis die Notizen-Layouts kommen (Schritt 5).
- „Rückgängig“ nach Pad schließen bringt das Pad nur dann an den alten Platz, wenn der Baum dazwischen nicht geändert wurde; sonst kommt es rechts neben das aktive Pad.
- Pads unter Mindestgröße: `noteMin` (260 × 200 px) gilt beim Ziehen und für neue Pads; nach einem kleineren Fenster können Pads im Baum kleiner sein (Pad rückt dann über die Grenze, wie vorher).
- Kopf ziehen greift nur auf freier Fläche des Kopfs (nicht auf Reitern, Deckkraft-Regler, Knöpfen) – in schmalen Pads ist dort wenig Platz (Kopfzeile schmaler Pads, siehe V47).
- „Neues Kanban-Board“ im Cockpit legt ein leeres Board an (ohne „Leer · Vorlage …“); Vorlagen weiter über Menü bzw. „+ Sheet“. Bei Gelegenheit die Seite „Vorlage …“ auch hier anbieten.
- Cockpit „Notizen“: Kopf der Liste sagt bei zwei bzw. drei Pads „Main Desk · 1 Pad“ (beim Test gesehen, vermutlich nur die Liste des gewählten Pads) – bei Gelegenheit prüfen.
- Im Testbrowser: `tab.drag` zieht in einem Zug; Ziehen eines Pad-Kopfs bei `.pad__tabs.right + 15` beginnen (freie Fläche). Hot Reload setzt die Test-Pads zurück.
- Tests in Claudes VM weiter nur mit `vitest-ersatz.js` (siehe V61): Ersatz nach `$HOME/vt2/node_modules/vitest/index.js`, `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts`, dann `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`.

## Commit-Text V90

**Summary:** `V90: F-210 Schritt 4 – Notizen-Modus als Baum (Grenzen, andocken/tauschen, Alt+Pfeil, Rückgängig am Ort), Lageplan im Notizen-Modus, Hilfe „Lageplan“`

**Description:**
```
- noteTree.ts: Pads im Notizen-Modus lückenlos im Teilungsbaum wie
  Slots; Startbaum = bisheriges Raster, neues Pad rechts neben das
  aktive, geschlossene rücken nach; Baum je Desk und Gerät; Tests
- Pad: Grenzen ziehen, Kopf ziehen = andocken (Rand) / tauschen
  (Mitte) / Desk-Rand, Alt+Pfeil tauscht, Alt+Umschalt+Pfeil Grenze
- „Gleich verteilen“ (Alt+G) gilt im Notizen-Modus für die Pads
- Pad schließen: „Rückgängig“ am alten Platz, Pad kommt genau
  dorthin zurück
- Lageplan im Notizen-Modus: neues Pad daneben/am Rand/als Reiter,
  Pad versetzen oder tauschen
- Hilfe „Lageplan“ und „Desk oder Notizen“, Begriff am Plan;
  Cockpit „Notizen“ zeigt den Baum
- Cockpit öffnet im Notizen-Modus gleich in „Notizen“; dort „Neu
  anlegen“: Neues Pad, To-do-Liste, Kanban-Board, Eisenhower-Matrix
- Lastenheft F-210 gebaut V90, Übergabe V90, Tests 448 grün
```
