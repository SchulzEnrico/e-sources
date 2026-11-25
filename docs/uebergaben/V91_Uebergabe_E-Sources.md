# Übergabe V91 → V92 E-Sources

Stand: 25.11.2026 · Chat V91 abgeschlossen · Nächster Chat: **V92 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V92 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-210** („Gebaut V91“), **F-218** („Gebaut V91“), **F-219** und **NF-08**. Regeln: Claude Doc „V89 – Weitere Regeln im Cockpit „Regeln““ (https://claude.ai/artifact/NuZMcqza3JXxHRbLyR6WWx, PDF `docs/Arbeitspakete/V89_Regeln_im_Cockpit.pdf`) – **RG1–RG8 entschieden** (= Vorschläge). Leitlinie: **an Trello und unserer UX/UI ausrichten**, **Funktion vor Design**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`; offene kleine Punkte aus `V74_`–`V91_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V91 passiert ist

Tests **459 grün** (V90: 448). `npx tsc --noEmit -p .` sauber. Im eingebauten Browser geprüft (`localhost:2910/?test=voll`, 1600 × 950), keine Fehler in der Konsole.

1. **F-219 bestätigt (Enrico: „ja meine ich“):** „Das Layout des Desk Mode ist noch nicht angepasst“ = F-219 (Portale/Slots im Look der Pads, dunkle Grundfarbe bleibt, auch Light Mode).
2. **F-210 Schritt 5 – Notizen-Layouts (Z1–Z4)** – neu `workspace/notesLayouts.ts` (Tests): `notesLayoutsOf`, `activeNotesLayout`, `noteTreeFor`/`setNoteTreeFor` (Baum je `linesKey(cls, orientation)`; fehlt er, gilt der zuletzt gespeicherte), `adoptOldTree` (Umzug aus `padDesks[desk].notes` beim Laden), `takeOutPads`/`putInPads`, `switchNotesLayout`, `addNotesLayout` (`current` · `empty` · `focus` · `day`), `copyNotesLayout`, `renameNotesLayout`, `deleteNotesLayout`/`restoreNotesLayout`, `notesLayoutView` (Kacheln fürs Mini-Abbild), `BUILTIN_SPEC`. Typen `NotesLayouts`/`NotesLayout`/`NotesLayoutContent`; `DeskNotes.board` ist jetzt `NotesLayouts` (vorher ungenutzt `DeskLayouts`). Lesen `parseNotesLayouts` in `storage.ts`. **Dateiformat 7 → 8** (`transfer.ts`).
3. `noteTree.ts`: `noteTreeOf(ws, desk, key)` und `setNoteTree(ws, desk, tree, key)` gehen über die Notizen-Layouts; Aktion `noteTree` mit `key`; App rechnet `noteKey = linesKey(setup.cls, setup.orientation)`. `NotesCockpit` liest mit Schlüssel `''` (= zuletzt gespeicherter Baum).
4. Aktionen `notesSwitch`, `notesAdd`, `notesCopy`, `notesRename`, `notesDelete`, `notesRestore` (useWorkspace).
5. **Oberfläche:** `components/NotesLayouts.tsx` (`NotesLayoutGroup`) im Cockpit „Layouts“ zwischen Desk-Layouts und Board-Vorlagen (`LayoutCockpit` Prop `onNotesApplied`, durchgereicht über `Overview`); Anordnung gilt für die oben im Cockpit gewählte Einstellung. App: `onNotesApplied` schaltet in den Notizen-Modus. Menü ⋮ › „Notizen-Layouts …“ (im Notizen-Modus, mit aktivem Namen) öffnet das Cockpit dort und fokussiert die gewählte Karte. CSS-Block „V91 (F-210 Schritt 5)“ am Ende von `App.css` (`.nl__mini`, `.nl__minipad`). Hilfe „Notizen-Layouts“ (`HELP_ICON.notesLayouts`), `TERMS.notesLayout`, Texte `NOTES_LAYOUT_TEXT`.
6. **F-218 – Datenmodell und Logik** – neu `workspace/ruleSet.ts` (Tests): Schalter A1–A9 (`SWITCHES`, Werk = erste Wahl), Gruppen (`SWITCH_GROUP`), W1–W4 (`WHEN_RULES`, ab Werk aus), `switchOf`/`setSwitch`, `whenOn`/`setWhen`, `parseRuleSet`, `noticeMs` (A1), `checksOf`/`checkAll`/`allChecked`, `onDone` (W1), `shouldAdvance` (W2), `doneAt`, `sweep` (W3/W4), `ruleBy` (Spur). `Workspace.ruleSet` (nur Abweichungen). Texte `RULE_SET_TEXT` (Namen, Sätze, Wahlen, Gruppen).
7. Lastenheft: F-210 „Gebaut V91“, F-218 „Gebaut V91“, F-219 bestätigt, Reihenfolge-Zeilen 25/33/34.

## Nächste Schritte

1. **F-218 Oberfläche** (RG1, RG5, RG6): im Bereich „Regeln“ (`components/Rules.tsx`) oben ein Gruppen-Rad (`ModeWheel`) Portale · Notizen · Anzeige; je Gruppe die bisherigen Regeln (Farbregeln/Seite → Kategorie/eingebaute = Portale), die Schalter A1–A9 als Zeile mit Name, Satz und Auswahl (Rad oder `select`, Ansage `RULE_SET_TEXT.said`), unter „Notizen“ der Block „Wenn … dann …“ mit W1–W4 (Schalter wie die eingebauten). A10: nur Verweis `RULE_SET_TEXT.pauseRef`. Aktionen `ruleSwitch`/`ruleWhen` im Reducer anlegen. Rad Radar | Regeln auch im Cockpit „Notizen“ – öffnet die Gruppe Notizen (RG6).
2. **F-218 Einbau:** A1 (`NOTICE_MS` → `noticeMs(ws)`, `null` = bis zum nächsten Klick), A2 WIP (heute K3 „fragen“), A3 Schloss außerhalb Kanban, A4 Abnahme, A5 Einklappen, A6 neues Pad, A7 leeres Sheet (`isEmptySheet` in `pads.ts`), A8 Ton/Mitteilung (`RemindAlarm`, `chime.ts`), A9 gleiche Source. W1 beim Ablegen in eine Spalte mit Bedeutung „erledigt“ (`onDone`), W2 nach Text-Änderung (`shouldAdvance` → nächste Spalte bzw. „in Prüfung“), `sweep` beim Start und stündlich, Meldung am Ort bzw. Ansage (`RULE_SET_TEXT.swept`). Hilfe „Regeln“ ergänzen.
3. **F-219 Design** (bestätigt): Portale im Look der Pads (Glas-Kopf mit Licht von oben, Reiter, Clay, schmaler Rahmen), dunkle Grundfarbe bleibt, auch Light Mode; **zuerst an einem Slot Vorher/Nachher (Bildschirmfoto) zeigen**, dann übertragen.
4. Danach (N13): Notiz ↔ Quelle (Schritt 6) → Personen + Projektfokus (8) → Rest Schritt 9 → Touren (F-217, dabei Tour „Cockpit“ um Notizen-Layouts). Portfolio „Aktuelles“ nachziehen (seit V83).
5. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V90 plus:
   - Cockpit „Layouts“ › Notizen-Layouts: Karten mit Mini-Abbild; „Fokus“ bzw. „Tagesplanung“ wählen → „Anlegen und wechseln“ (oder Enter/Doppelklick) → Desk zeigt im Notizen-Modus die neuen Pads (Fokus: Kanban groß, To-do schmal).
   - Zurück zu „Notizen-Layout 1“ → die alten Pads sind wieder da, Anordnung wie vorher.
   - „Neues Notizen-Layout“ (Kopie der aktuellen Pads / Leer / mitgeliefert), Umbenennen (F2), Kopieren, Löschen mit Rückgängig am Ort.
   - Grenzen im Notizen-Modus ziehen, dann auf einem anderen Gerät (nach Abgleich) prüfen: dieselbe Anordnung (Baum gleitet jetzt mit).
   - ⋮ des Desks im Notizen-Modus: „Notizen-Layouts …“ zeigt den aktiven Namen und öffnet das Cockpit dort.

## Kleine Punkte (neu in V91)

- Ein Sheet liegt höchstens in einem Pad: Holt man ein Sheet aus einem gespeicherten Notizen-Layout in ein aktives Pad (z. B. über die Library), bleibt es im Vorrat stehen, bis man zurückwechselt – dann fällt es dort weg (die gerade abgelegten Pads gewinnen). Bei mehr als zwei Layouts kann ein Sheet theoretisch in zwei Vorräten stehen; das erste Zurückholen gewinnt.
- Pad-Plätze im Desk-Modus (geräteeigen `padDesks.places`) gespeicherter Pads fallen beim nächsten Laden weg (`parsePadDesks` kennt nur aktive Pads) – nach dem Zurückwechseln liegen solche Pads im Desk-Modus am Startplatz.
- „Kopieren“ eines Notizen-Layouts legt eigene Sheets an (Name „… (Kopie)“), dieselben Notizen stehen dann in zwei Sheets. Das ist gewollt (ein Sheet = ein Pad), kann in der Library aber doppelt wirken.
- „Wechseln“ auf das schon aktive Notizen-Layout schaltet nur in den Notizen-Modus (Meldung „… ist jetzt aktiv“).
- Notizen-Layouts: „Als Datei speichern“ fehlt noch (NF-08), siehe Lastenheft F-210.
- Die Überschrift im Band der Gruppe (`.lc__band h3`) ist wie bei den Board-Vorlagen im Bild kaum zu sehen (nur Werkzeuge rechts) – bei F-219 mit ansehen.
- Esc im Cockpit „Layouts“ springt zuerst auf „Portale“ (wie seit V56), erst das zweite Esc schließt.
- Cockpit „Notizen“ nutzt für Desks im Notizen-Modus den zuletzt gespeicherten Baum des aktiven Layouts (nicht zwingend den dieser Einstellung).
- `ruleSet.ts` hat noch keinen Verbraucher in der Oberfläche – Werk bleibt überall unverändert, bis Schritt 1/2 kommen.
- Tests in Claudes VM weiter nur mit `vitest-ersatz.js` (siehe V61/V90); der Ersatz kennt kein `toBeCloseTo` (gerundet vergleichen). Beim Übersetzen meldet `tsc` zwei alte Fehler in `gist.ts` (nur im Ersatz-Lauf ohne strict, harmlos) und `.at` (Ziel es2020) – Node führt beides aus.

## Commit-Text V91

**Summary:** `V91: F-210 Schritt 5 – Notizen-Layouts (Fokus, Tagesplanung, Wechsel mit Vorrat, Dateiformat 8), F-218 Regeln: Datenmodell A1–A9 und W1–W4`

**Description:**
```
- notesLayouts.ts: Notizen-Layouts je Desk – Pads mit Sheets und
  Anordnung je Bildschirm-Einstellung; Wechsel legt die Pads in den
  Vorrat und holt die des Ziels (nichts wird gelöscht); Tests
- Mitgeliefert: „Fokus“ (Kanban groß, To-do schmal) und
  „Tagesplanung“ (To-do, Matrix, Notizblock) mit leeren Sheets
- Anlegen aus Kopie/Leer/mitgeliefert, Kopieren, Umbenennen,
  Löschen mit Rückgängig am Ort
- Baum des Notizen-Modus liegt jetzt im Notizen-Layout und wird
  abgeglichen; alter Baum (V90) wird beim Laden übernommen
- Dateiformat 8
- Cockpit „Layouts“: Gruppe „Notizen-Layouts“ zwischen Desk-Layouts
  und Board-Vorlagen; Menü „Notizen-Layouts …“ im Notizen-Modus;
  Hilfe „Notizen-Layouts“
- ruleSet.ts: Schalter A1–A9 und Wenn-dann-Regeln W1–W4 (Datenmodell,
  Checklisten, Archivieren, Fälliges dringend, Spur); Tests
- Lastenheft F-210/F-218/F-219, Übergabe V91, Tests 459 grün
```
