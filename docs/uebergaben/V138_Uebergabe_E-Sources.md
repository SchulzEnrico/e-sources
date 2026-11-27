# Übergabe V138 → V139 E-Sources

Stand: 27.11.2026 · Chat V138 · Nächster Chat: **V139 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V139 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-234** („Nachtrag V137“, **„Nachtrag V138“**), **F-235** („Korrektur V138“), **F-236** (Entscheidungs-Doc, Antwort offen), **F-232** (P11–P14 weiter offen) und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown, Spalte „Antwort Enrico“): **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (G1–G8, Stand V138 leer) und **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (P11–P14, Stand V138 leer, Rev. 17). **Hinweis:** F-232 P11 (Farben je Dokument) und F-236 (Layout-Vorlage) überschneiden sich – wenn beide beantwortet sind, als ein Paket bauen (F-236 B schließt P11 ein). Beantwortet → Lastenheft nachziehen und bauen. Sonst **erstes Paket V139: Rest P9** – Feedback (Problemstellung) und Entscheidungsvorlagen (Nutzwertanalyse) als Blatt wie Papier (Vorlage `ProjectForms`/`paper__*`, Leitsatz Aussehen wie im Report), **dann K14 Eingang** (F-231: festes Sheet „Eingang“ als To-do-Liste, Schnellerfassung landet dort, V sortiert ein), F-230 F7. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **bei Dokumenten Aussehen wie im Report**, **Funktion vor Design**, **Retro-Designs: Bedienelemente im Stil des Systems, Räder gleich**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V138_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Prüfdateien (F9) erst ab 07.12.** **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl unverändert aus `V135_Uebergabe_E-Sources.md`. Tests V138: **736** grün (`gpm` 56, `workspace` 528). `npx tsc --noEmit -p .` sauber (mit `timeout 170`, `timeout_ms: 180000`).

**Grafiken als Bild prüfen:** wie V137 (`node` mit `$HOME/vt2/out`, SVG nach `Projects/Claude outputs/tmp138/`, `device_stage_files`, im Container `rsvg-convert`).

**Browser:** Kapitel-Rad lässt sich jetzt zuverlässig per Tastatur drehen (Rad fokussieren, ArrowUp/ArrowDown, danach ~1,5 s warten bis `aria-valuetext` stimmt). In Enricos lokalem Stand sind ColorGentlemen-Kapitel 15.x leer (ältere Beispieldaten) – zum Ansehen das Live-Projekt E-Sources wählen (Projekt-Rad, Ende-Taste); es ist schreibgeschützt.

## Was in V138 passiert ist

1. **Korrektur Live-Projekt (Enrico 13:30):** `tools/live_project.py` erkennt jetzt auch F-Punkte ohne Stand-Vermerk (zählen als offen) und den Vermerk **vor** der Nummer (`&#91;✓ V26\] **F-179**`). Ergebnis: **204 F-Punkte, 2 ersetzt, 128 fertig, 25 teilweise, 49 offen**. Abweichung zu Enricos Zahl (124/53): F-160, F-179, F-181, F-184 tragen ✓ vor der Nummer und zählen daher als fertig. Die Ausgabe nennt jetzt auch die Ersetzten. Test „V138: zählt alle F-Punkte …“. Lücken F-01–F-99 nachgezählt: 32 (Enrico: 31) – unkritisch, nur zur Info.
2. **Bearbeiten am Ort in allen übrigen Grafiken (Enrico 12:59/13:15):** `gpmFigures.ts` Helfer `edg(key,label)` + `hit()` (unsichtbare Trefferfläche). Phasenplan: Phasen `phases:id`, Rauten `milestones:id`. Balkenplan: jede eigene Zeile `tasks:id` bzw. `milestones:id`. Eisenhower: Einträge `eisenhower:id`. Nachrichtenquadrat: 10 Flächen `messages:row:feld`. Belbin: Kreise `teamRoles:row:pf|um|…`. `FigEditor` versteht `Formular:Zeile:Feld` (nur dieses Feld, kein Löschen); `FIG_FIELDS` + `phases`, `milestones`, `eisenhower`, `ganttTasks`; `FIG_NO_REMOVE`. Hinweistext `figEditHint2` für nicht verschiebbare Grafiken.
3. **Neue Felder am Arbeitspaket** (`formKit` FIELDS.tasks): `duration` (Arbeitstage), `notBefore`, `due` – im Balkenplan-Fenster, Tabelle „8 Arbeitspakete“ hat feste Spaltenliste (ohne die neuen, über „Felder“ zuschaltbar). setCell für `duration`/`notBefore`.
4. **Knöpfe im Bearbeiten-Fenster aufgeteilt:** Anlegen links, Löschen + Schließen rechts (`.pjf__figacts-end`). Hover/Fokus auf Trefferflächen rot hinterlegt (CSS `.fg-hit`, Kreise).
5. **Belbin-Blatt** verkleinert alle Kreise, wenn sie nicht aufs Blatt passen (rechte Kreise wurden abgeschnitten).
6. **Umschalt-Räder (ModeWheel):** `aim`-Ref – schnelle Pfeiltasten zählen vom Ziel der laufenden Drehung weiter (Kapitel-Rad verlor Drücke, V137 notiert). Gilt für alle Räder.
7. Handbuch V138 (7.1, 12, Änderungsverzeichnis), Lastenheft (F-234 Nachtrag V138, F-235 Korrektur V138), `APP_VERSION = 'V138'`, Live-Projekt V138.

## Prüfliste für Enrico (zusätzlich zu V77–V137)

- ColorGentlemen › **7 Phasenplan (Grafik):** Phase anklicken → Name, Beginn, Ende ändern; Raute anklicken → Meilenstein-Termin.
- **9 Balkenplan:** Zeile anklicken → Dauer, frühester Beginn, fällig am; Balken verschieben sich; „Arbeitspaket darunter anlegen“.
- **15.1 Belbin / 15.2 Eisenhower / 15.3 Nachrichtenquadrat:** Kreis → Punkte; Eintrag → wichtig/dringend (wandert ins andere Feld); Fläche im Quadrat → genau dieses Feld. (Lokal ggf. erst „+ Zeile“ anlegen bzw. Live-Projekt ansehen.)
- Nur Tastatur: Tab von Eintrag zu Eintrag, Enter öffnet, Esc schließt und setzt den Fokus zurück.
- Kapitel-Rad: mehrmals schnell Pfeil runter/hoch – jeder Druck eine Raste?
- Live-Projekt: 204 F-Punkte bzw. 202 Vorgänge ohne die Ersetzten, F-16 u. a. jetzt als offen sichtbar.

## Kleine Punkte (neu in V138)

- Lastenheft: Liste oben (Zeile ~135) führt F-234 als „● gebaut“, der Detailpunkt (~488) noch als „◐ entschieden V134“ – das Skript nimmt den Detailpunkt (◐). Bei Gelegenheit angleichen (Enrico entscheidet, ob F-234 ● ist).
- Im schreibgeschützten Live-Projekt öffnet das Bearbeiten-Fenster trotzdem; Änderungen werden abgewiesen – Hinweis am Ort im Fenster wäre besser.
- Dauer-Feld zeigt nur eine von Hand gesetzte Dauer; abgeleitete Dauer (aus Terminen bzw. 1 Tag) bleibt leer – ggf. blass als „gerechnet“ anzeigen.
- `Projects/Claude outputs/tmp137/` und `tmp138/` enthalten Prüf-SVGs (dürfen weg; Löschen braucht Freigabe).

### Ältere offene Punkte

Unverändert in `V137_Uebergabe_E-Sources.md`, `V136_…`, `V135_…`, `V134_…`, `V133_…`, `V132_…`, `V131_…`.

## Commit-Text V138 (e-sources)

**Summary:** `V138: Live-Projekt zählt alle 204 F-Punkte, Phasenplan/Balkenplan/Eisenhower/Nachrichtenquadrat/Belbin am Ort bearbeitbar, Räder zählen jeden Tastendruck`

**Description:**
```
- F-235 Korrektur: tools/live_project.py zählt F-Punkte ohne Vermerk als offen und erkennt den Vermerk vor der Nummer – 204 F-Punkte (128 fertig, 25 teilweise, 49 offen, 2 ersetzt); Test dazu
- F-234: Phasenplan, Balkenplan, Eisenhower-Matrix, Nachrichtenquadrat und Belbin am Ort bearbeiten (Klick, Enter, Tab, Esc)
- Arbeitspaket: Dauer (Arbeitstage), frühester Beginn, fällig am im Balkenplan bearbeitbar
- Bearbeiten-Fenster: Anlegen links, Löschen/Schließen rechts
- Belbin-Blatt passt immer in die Breite
- Umschalt-Räder: schnelle Pfeiltasten gehen nicht mehr verloren (Kapitel-Rad)
- Tests +2 (736); Handbuch V138, Lastenheft, APP_VERSION V138, Live-Projekt V138, Übergabe V138

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q47KaZXbDqCzS7z2EE
```
