# Übergabe V139 → V140 E-Sources

Stand: 27.11.2026 · Chat V139 · Nächster Chat: **V140 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V140 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-232** („Gebaut V139“ = P9 Rest), **F-234** („Nachtrag V139“), **F-231** (K14 Eingang, Doc-Zeile „Inbox“), **F-236** (Entscheidungs-Doc, Antwort offen), **F-232** (P11–P14 weiter offen) und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown, Spalte „Antwort Enrico“, dazu `query` auf Kommentare): **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (G1–G8, Stand V139 leer, Rev. 6) und **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (P11–P14, Stand V139 leer, Rev. 17). P11 und F-236 überschneiden sich – wenn beide beantwortet sind, als ein Paket bauen (F-236 B schließt P11 ein). Beantwortet → Lastenheft nachziehen und bauen. **Neu (Enrico 13:57):** „Es müssten auch Eisenhower-Matrizen anlegbar sein, die sich nicht am PSP orientieren. Eigentlich hat das mit dem PSP doch gar nichts zu tun?“ – stimmt: Im Report steht die Matrix unter 15 Persönliche Kompetenzen (ICB4 4.4.1 Selbstreflexion und Selbstmanagement, Zeitmanagement), nicht unter der Planung. **Als Erstes ein Entscheidungs-Doc an der Seite (PDF nach `docs/Arbeitspakete/`)**: Vorschlag Kapitel 15.2 als eigene Liste wie Nachrichtenquadrat/Belbin (mehrere Matrizen je Projekt, je Matrix Name, Person, Datum und eigene Einträge mit wichtig/dringend, Anlegen/Ziehen/Löschen in der Grafik), dazu „Arbeitspakete übernehmen …“ als Option statt fester Kopplung; Verhältnis zur Eisenhower-Ansicht im Notizen-Modus (Sheet-Art `eisenhower`, freie Notizen) klären – ggf. dieselbe Matrix in beiden; Beispiel ColorGentlemen wie Abb. 17. Nach Enricos Antwort bauen. Danach bzw. sonst **K14 Eingang** (F-231, Doc V120: „Sheet ‚Eingang‘ als feste To-do-Liste, V sortiert ein“; Trello „Inbox“ = schnell erfassen, später einsortieren; F-106 Gedankenparkplatz). Vor dem Bau klären, wo heute „Neue Notiz“ landet (Aktion `newNote` in `useWorkspace.ts` ~524, Dock/Notiz-Knopf `make` up/right/left/down in terms ~1597, Notizblock = Eingang für lose Notizen laut Lastenheft Z. 430) – Vorschlag: ein festes To-do-Sheet „Eingang“ je Workspace (nicht löschbar, umbenennbar), Schnellerfassung (Notiz-Knopf, Dock, Tastenkürzel) landet dort, Taste V sortiert ein (vorhandene V-Leiste), Zahl offener Einträge am Reiter; bei Unklarheit ein kleines Entscheidungs-Doc an der Seite. **Dann F-230 F7.** **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **bei Dokumenten Aussehen wie im Report**, **Funktion vor Design**, **Retro-Designs: Bedienelemente im Stil des Systems, Räder gleich**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V139_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Prüfdateien (F9) erst ab 07.12.** **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl unverändert aus `V135_Uebergabe_E-Sources.md`. Tests V139: **739** grün (`gpm` 59, `workspace` 528). `npx tsc --noEmit -p .` sauber (mit `timeout 170`, `timeout_ms: 180000`).

**Grafiken als Bild prüfen:** wie V137 (`node` mit `$HOME/vt2/out`, SVG nach `Projects/Claude outputs/tmp…/`, `device_stage_files`, im Container `rsvg-convert`).

**Browser:** wie V138 (Kapitel-Rad per Tastatur, ~1,5 s warten). In V139 nicht im Browser angesehen – Blätter (Meldungen › Blatt, Entscheidungen › Blatt) und Eisenhower-Ziehen bei Gelegenheit ansehen.

## Was in V139 passiert ist

1. **Docs geprüft:** F-236 (G1–G8) und F-232 (P11–P14) unbeantwortet, keine Kommentare.
2. **Organigramm (Enrico 13:48):** Nach dem Anlegen einer Rolle sprangen alle übrigen auseinander. Ursache: die gewohnte Ordnung galt nur, solange **keine** Rolle `parent` hatte (Enricos lokale ColorGentlemen-Daten sind älter, ohne `parent`). Neu `orgParents(roles)` in `gpmFigures.ts`: je Rolle Eintrag vor gewohnter Ordnung, Kreise lösen (zuerst eine gewohnte Verbindung kappen). Test.
3. **Eisenhower (Enrico 13:52/13:55):** „liegen lassen“ steht in der Grafik (wie in der Tabelle); Einträge in ein anderes Feld **ziehen** (`eisenQuadAt`, `eisenMarks`; setzt wichtig/dringend über zwei `cell`-Ops, Rückgängig am Ort), **Alt+Pfeile** (hoch/runter = wichtig, rechts/links = dringend); Knopf **„Arbeitspaket anlegen“** über der Grafik (legt über das Formular `tasks` an und öffnet das Kasten-Fenster `tasks:<id>`); Rad **„Einträge“ Gekürzt · Alle** (`esource.eisenAll.v1`; `eisenGeo` lässt die Reihen wachsen, Ziehen nutzt dieselben Grenzen; Bericht bleibt gekürzt). `figureSvg` Option `all`. Tests.
4. **F-232 P9 Rest – Feedback und Entscheidungsvorlagen als Blatt** (`components/PaperDocs.tsx`, Texte `DOC_SHEET_TEXT`): Rad **„Darstellung“** an derselben Stelle in beiden Ansichten (`useShape`, `ShapeWheel`). **Meldungen** › Board · Blatt (`esource.feedbackShape.v1`), Rad „Meldung“, **Problemstellung** nach `Fb.problemSheet` (Reihenfolge wie `feedbackMarkdown`), Pflicht-Stern, „Noch offen: …“ (`Fb.sheetGaps`), alle Felder direkt (`fbEdit`), eigene Felder je Art (Text, Zahl, Datum, Auswahl, Ja/Nein). **Entscheidungen** › Werkzeug · Blatt (`esource.decisionShape.v1`): **Entscheidungsvorlage** mit Muss-Kriterien, Gewichten (direkt, Summe gerechnet), Bewertungsmatrix (direkt 0–10, Nutzwert/Rang gerechnet), Empfehlung, Entschieden für, Begründung; gesperrt nach „Entschieden“. `Field`/`Row` aus `ProjectSheet.tsx` jetzt exportiert, `Fb.placeLine` exportiert. CSS `.paper__section`, `.paper__req`, `.paper__gaps`, `.paper__calc`, `.paper__matrix` u. a. (App.css Ende).
5. Handbuch V139 (7.1, 8, 9, Änderungsverzeichnis), Lastenheft (F-232 Gebaut V139, F-234 Nachtrag V139), `APP_VERSION = 'V139'`, Live-Projekt V139 (204 F-Punkte: 128 fertig, 25 teilweise, 49 offen, 2 ersetzt).

## Prüfliste für Enrico (zusätzlich zu V77–V138)

- ColorGentlemen › **6.1 Organigramm:** Rolle anlegen (Kasten › „Rolle darunter anlegen“) – die übrigen bleiben verbunden an ihrem Platz.
- **15.2 Eisenhower:** „liegen lassen“ sichtbar; Eintrag in ein anderes Feld ziehen (Tabelle darunter zieht mit), „Rückgängig“; Eintrag fokussieren (Tab) + Alt+Pfeil; „Arbeitspaket anlegen“ → Fenster mit Name usw.; Rad „Einträge“ auf „Alle“ → alle Einträge sichtbar, Ziehen geht weiter.
- **Meldungen** › Rad „Darstellung“ › Blatt: Meldung wählen, Felder beschreiben (Meldung am Feld), Pflichtfeld-Stern und „Noch offen: …“; Schweregrad/eigene Felder auswählen.
- **Entscheidungen** › Rad „Darstellung“ › Blatt: Gewicht und Bewertung direkt eintragen, Nutzwert/Rang/Empfehlung rechnen mit; nach „Entschieden“ gesperrt.
- Nur Tastatur auf beiden Blättern: Tab von Feld zu Feld, Enter übernimmt.

## Kleine Punkte (neu in V139)

- Eisenhower: Reihenfolge innerhalb eines Felds folgt dem PSP – eigene Reihenfolge (Ziehen im Feld) bei Bedarf mit Enrico klären.
- Problemstellung: Bilder der Meldung (`pics`) und Vermerke/Spur stehen noch nicht auf dem Blatt (nur im Board-Fenster); Druck/Bericht der Blätter noch nicht im Projektbericht.
- Entscheidungsvorlage: Kriterien/Lösungen anlegen und umbenennen nur im Werkzeug; auf dem Blatt nur Titel, Frage, Gewichte, Bewertungen.
- Kleine Punkte aus V138 (F-234 ●/◐ angleichen, Hinweis am Ort im schreibgeschützten Live-Projekt, gerechnete Dauer blass, tmp137/tmp138 löschen) bleiben offen.

### Ältere offene Punkte

Unverändert in `V138_Uebergabe_E-Sources.md`, `V137_…`, `V136_…`, `V135_…`, `V134_…`, `V133_…`, `V132_…`, `V131_…`.

## Commit-Text V139 (e-sources)

**Summary:** `V139: Problemstellung und Entscheidungsvorlage als Blatt, Eisenhower ziehen/anlegen/alle zeigen, Organigramm springt nicht mehr auseinander`

**Description:**
```
- F-232 P9 Rest: Meldungen (Problemstellung) und Entscheidungen (Nutzwertanalyse) als Blatt wie Papier, Rad „Darstellung“, Felder direkt bearbeitbar, gerechnete Werte blass
- Eisenhower: „liegen lassen“ in der Grafik, Einträge in ein anderes Feld ziehen bzw. Alt+Pfeile, „Arbeitspaket anlegen“, Rad „Einträge“ Gekürzt · Alle
- Organigramm: Rollen ohne „Übergeordnete Rolle“ behalten ihren Platz, wenn andere eine haben (orgParents, Kreise gelöst)
- Tests +3 (739); Handbuch V139, Lastenheft, APP_VERSION V139, Live-Projekt V139, Übergabe V139

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q5EBN6HXuAiV5KdtfV
```
