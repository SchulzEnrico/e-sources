# Übergabe V140 → V141 E-Sources

Stand: 27.11.2026 · Chat V140 · Nächster Chat: **V141 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V141 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-237** (neu: „Entschieden V140“, H10 Teilprojekte, „Gebaut V140“, „Nebenbei V140 – Nachrichtenquadrat“), **F-231 K14** (Zeile „Entscheidungs-Doc V140“ direkt über F-237), **F-236** und **F-232** (P11–P14, beide weiter offen) und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown – Ergebnis landet in einer Datei, mit Python aus `bytes_b64` lesen; Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (I1–I9, Stand V140 leer, Rev. 6), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (G1–G8, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (P11–P14, Rev. 17). Beantwortet → Doc anpassen („io“ = Vorschläge eintragen), PDF unter `docs/Arbeitspakete/` erneuern (Export `pdf` mit `pictures: "fit"` → Datei, mit Python dekodieren, `device_commit_files` mit `force`), Lastenheft nachziehen, bauen. **K14** zuerst (Vorschlag A: festes To-do-Sheet „Eingang“ je Arbeitsfläche, feste Kennung, nicht löschbar; Gedankenparkplatz F-106 Alt/⌥+E – vorher prüfen, ob frei; Dock-Notiz und „Neue Notiz“ landen dort; V sortiert ein, auch ins Projekt und in Eisenhower-Matrizen; Zähler am Reiter, im Cockpit, am Knopf „Notizen & Aufgaben“). **Dann F-230 F7.** **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, Retro-Designs: Bedienelemente im Stil des Systems, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V140_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl unverändert aus `V135_Uebergabe_E-Sources.md`. Tests V140: **741** grün (`gpm` 61, `workspace` 528). `npx tsc --noEmit -p .` sauber (mit `timeout 170`, `timeout_ms: 180000`).

**Grafiken als Bild prüfen:** `npx tsc --outDir $HOME/vt2/out …` (wie run.sh), dann `node` in `$HOME/vt2/out` mit `require('./gpmFigures')`, SVG nach `Projects/Claude outputs/tmp140/`, `device_stage_files`, im Container `rsvg-convert`.

**Browser:** wie V138; 15.2/15.3 im Test: `?test=voll`, „Beispielprojekt „ColorGentlemen“ anlegen“ öffnet das zuletzt gewählte Kapitel; Kapitel-Rad `getByRole('slider', { name: /Kapitel/ })` fokussieren, ArrowDown, 1,6 s warten.

## Was in V140 passiert ist

1. **Docs geprüft:** F-236 und F-232 unbeantwortet.
2. **F-237 neu – Eisenhower-Matrizen unabhängig vom PSP** (Enrico 13:57, ICB4 4.4.1). Entscheidungs-Doc https://claude.ai/artifact/JdCxJR7C6nADP8J3k8u2oN (PDF `docs/Arbeitspakete/F-237_V140_Eisenhower_ohne_PSP.pdf`): **entschieden 14:03** Option B, H1–H9 wie Vorschlag, H6 ergänzt „jede Matrix aus Notizen abbildbar“, **H10 Teilprojekte** (14:22). **Gebaut:** Matrix = Eisenhower-Sheet (`NoteView.person`, `date`, `owner` Projekt), Projekt `eisenMaps`, `eisenSel`, `eisenInit`. `sheets.ts`: `projectMatrices` (eigene + abgebildete + Teilprojekte), `projectMatrix`, `matrixEntries`, `editMatrix`, `setMatrixIds`, `subProjectIds`; `theMatrix` = persönliche (erste ohne Projekt/Person), nur sie sammelt ein (H5). `formKit.ts`: FormOp `eisen` → `applyEisen` (new, select, map, edit, take, delete, restore), `ensureMatrices` (H8: beim Laden, `replace`, `exchange`, `liveProject`, `liveCopy`, Beispiel anlegen in `samples.toggleSample`), `openWorkPackages(ws, pid, withSubs)`, Zeilen 15.2 aus der gewählten Matrix, Titel bearbeitbar, `addRow` mit `init.quad`, `removeRow` (nimmt heraus; Notiz nur hier → gelöscht; RowUndo `eisen`), `COMPUTED` ohne eisenhower. `gpmFigures.ts`: `eisenView`, Einträge aus der Matrix, Felder als Knopf `.fg-quad[data-quad]`, Kopf mit Datum/Person, `done`-Option (durchgestrichen). `gpmReport.ts`: je Matrix Grafik + Tabelle. `ProjectForms.tsx`: `eisenBlock` (Rad „Matrix“, „+ Matrix“, „Matrix aus Notizen abbilden …“, „Arbeitspakete übernehmen …“ mit Ankreuzliste, „Matrix löschen“/„Nicht mehr abbilden“, Name/Person/Datum), Doppelklick/Enter auf Feld legt an, Entf nimmt heraus, Rad „Einträge“ Gekürzt · Alle · Erledigte. Pad/useWorkspace: E3 aufgehoben (mehrere Matrizen). FigEditor markiert Vorgabetext „Neue…“.
3. **Nachrichtenquadrat (Enrico 14:26–14:31):** Texte brechen nach Feldbreite um (`per`, `max` + `textLength` als Sicherung); senkrechte Felder zeigen beim Hover/Fokus der Klickfläche **das ganze Feld waagerecht** als Karte `.fg-card` (300 breit, mittig über der senkrechten Schrift, außen über den Rand: CSS `overflow: visible` für `.is-square`); im Bericht unsichtbar (`opacity="0"`).
4. **K14 Eingang:** Entscheidungs-Doc https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (PDF `docs/Arbeitspakete/F-231_K14_V140_Eingang.pdf`), Antwort offen. Heute: „Neue Notiz“ im Portal nur Library (`newNote`, useWorkspace ~522), Pad „+“ ins offene Sheet (`padNote`), Dock-Knopf `make` up/right/left/down.
5. Handbuch V140 (7.1 Eisenhower-Matrizen, Nachrichtenquadrat; Änderungsverzeichnis), Hilfe `matrixUse`, Lastenheft (F-237, K14), `APP_VERSION = 'V140'`, Live-Projekt V140 (205 F-Punkte: 129 fertig, 25 teilweise, 49 offen, 2 ersetzt).

## Prüfliste für Enrico (zusätzlich zu V77–V139)

- ColorGentlemen › **15.2:** Matrix „Eisenhower-Matrix ColorGentlemen“ wie vorher; „+ Matrix“ → Name/Person/Datum ändern (Kopf der Grafik zieht mit); Doppelklick in ein Feld bzw. Tab auf ein Feld + Enter → Titel tippen; Entf auf Eintrag → Rückgängig; „Arbeitspakete übernehmen …“ (Alle ankreuzen, Esc); Rad „Matrix“ wechseln; „Matrix löschen“ → Rückgängig.
- Notizen-Modus: zweite Eisenhower-Matrix anlegen (geht jetzt); in 15.2 „Matrix aus Notizen abbilden …“ → sie steht im Rad, „Nicht mehr abbilden“.
- Teilprojekt anlegen (übergeordnetes Projekt = ColorGentlemen), dort eine Matrix → erscheint in ColorGentlemen 15.2 mit „aus Teilprojekt …“.
- Rad „Einträge“ › „Erledigte“; Bericht: je Matrix eine Seite.
- **15.3 Nachrichtenquadrat:** keine Texte über Ränder; über die senkrechten Felder fahren bzw. mit Tab fokussieren → Karte waagerecht, mittig, Empfänger gleich breit wie Sender.

## Kleine Punkte (neu in V140)

- Pad-Matrix zeigt Person/Datum noch nicht im Kopf (nur 15.2).
- Live-Projekt: `refreshLiveProject` verliert `eisenMaps` des Live-Projekts (Matrix selbst bleibt).
- Projekte, die nach dem Laden neu angelegt werden, bekommen keine Matrix von selbst (erst beim nächsten Laden, wenn sie Arbeitspakete haben) – ggf. `eisenInit` beim Anlegen setzen.
- „Arbeitspakete übernehmen“ legt APs ins Feld nach ihren Schaltern; Reihenfolge im Feld weiter nach Einfügen (eigene Reihenfolge offen, siehe V139).
- `MATRIX_TEXT.exists` ungenutzt; tmp137/tmp138/tmp140 in `Projects/Claude outputs/` löschen.
- Kleine Punkte aus V139/V138 bleiben offen.

### Ältere offene Punkte

Unverändert in `V139_Uebergabe_E-Sources.md`, `V138_…` bis `V131_…`.

## Commit-Text V140 (e-sources)

**Summary:** `V140: Eisenhower-Matrizen unabhängig vom PSP (mehrere, eigene Einträge, aus Notizen abbilden, Teilprojekte), Nachrichtenquadrat lesbar, Doc K14 Eingang`

**Description:**
```
- F-237 (entschieden V140, H1–H10): Matrix = Eisenhower-Sheet mit Person, Datum und Projekt; 15.2 mit Rad „Matrix“, „+ Matrix“, „Matrix aus Notizen abbilden …“, „Arbeitspakete übernehmen …“, Name/Person/Datum, löschen bzw. nicht mehr abbilden
- Einträge direkt in der Grafik (Doppelklick/Enter ins Feld, Entf nimmt heraus, Rückgängig am Ort), Rad „Einträge“ mit „Erledigte“, Bericht je Matrix
- Nur die persönliche Matrix sammelt wichtig/dringend ein; im Notizen-Modus mehrere Matrizen (E3 aufgehoben); bestehende Projekte bekommen einmalig eine Matrix mit ihren offenen Arbeitspaketen
- Teilprojekte: ihre Matrizen und Arbeitspakete stehen im übergeordneten Projekt zur Wahl
- Nachrichtenquadrat: Texte bleiben in den Feldern, senkrechte Felder beim Hover/Fokus waagerecht als Karte
- Entscheidungs-Docs F-237 und K14 Eingang (PDF lokal)
- Tests +2 (741); Handbuch V140, Lastenheft, APP_VERSION V140, Live-Projekt V140, Übergabe V140

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q6CoHm4TDBFMRqn3Ly
```
