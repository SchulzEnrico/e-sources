# Übergabe V137 → V138 E-Sources

Stand: 27.11.2026 · Chat V137 · Nächster Chat: **V138 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V138 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-234** („Gebaut V137“, „Nachtrag V137“), **F-236** (neu, Entscheidungs-Doc, Antwort offen), **F-232** (P11–P14 weiter offen) und **F-227** (Handbuch). **Erstes Paket V138:** wenn Enrico das Doc F-236 beantwortet hat → **F-236 bauen** (Layout-Vorlage, alle Grafiken lesen ihre Farben aus der Vorlage, Generator-Blatt, Abweichung je Element); sonst zuerst **„Bearbeiten im Blatt“ für die übrigen Grafiken** (Phasenplan: Phasen/Meilensteine am Ort, Balkenplan: Vorgang am Ort, Eisenhower-Einträge, Nachrichtenquadrat-Felder per Klick auf das Feld im Quadrat, Belbin-Kreise) – Enrico 12:59/13:15: „Alle Ansichten … in ihrer Ansicht bearbeitbar … Gleiches gilt auch für alle anderen Darstellungen“, und **Knöpfe überall gut aufgeteilt** (13:17: „Checke das überall auf UI“). Dann F-232 P11–P14 (wenn beantwortet), Rest P9, K14 Eingang, F-230 F7. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **bei Dokumenten Aussehen wie im Report**, **Funktion vor Design**, **Retro-Designs: Bedienelemente im Stil des Systems, Räder gleich**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V137_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Prüfdateien (F9) erst ab 07.12.** **Dashboards** zählen wie V127 (F-234 ● neu, F-236 ◐ neu). Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl unverändert aus `V135_Uebergabe_E-Sources.md`. Tests V137: **734** grün (`gpm` 54, `workspace` 528). `npx tsc --noEmit -p .` sauber (mit `timeout 170`, `timeout_ms: 180000`).

**Grafiken als Bild prüfen (neu V137):** `node` mit den übersetzten Dateien aus `$HOME/vt2/out` (`figureSvg(ws, pid, 'org' | 'square' | …)`) eine SVG nach `Projects/Claude outputs/` schreiben, mit `device_stage_files` holen und im Container mit `rsvg-convert` ansehen – schneller als das Rad im Browser zu drehen. (Rad „Kapitel“ per Tastatur im Browser-Werkzeug unzuverlässig: ArrowUp = ein Kapitel zurück, ArrowDown/End reagierten nicht immer.) Ein `&` im SVG-Text bricht `rsvg-convert` (Browser verzeiht es) – Texte immer mit `esc()`.

**Dateien:** neue Dateien direkt mit `device_bash` (`cat > … <<'EOF'`), Änderungen per Python `str.replace` mit `assert` (lange Skripte als Datei unter `$HOME/sc/` ablegen und ausführen – ein einzelner langer Befehl wurde als „zu lang“ abgewiesen). **`device_commit_files` beim Überschreiben meiden** (V136).

**Browser:** wie V136 (`?demo` für den Schreibschutz). Das Werkzeug „Built-in browser“ erreicht `http://localhost:2910` auf Enricos Mac.

## Was in V137 passiert ist

1. **F-234 Rest fertig (Prüfung offen):** Kapitel **12.1 AP-Statusbericht** (`wpReports`, `newWpReport` friert Plan = Basisplan, Soll = Gantt, Ist ein; Blatt wie Abb. 15 `wpReportSvg` mit KW, Ampel, Kreis), **15.1 Teamrollen nach Belbin** (`teamRoles`, `belbinSvg`), **15.2 Eisenhower** (aus wichtig/dringend, im Blatt ankreuzbar, `eisenhowerSvg`), **15.3 Nachrichtenquadrat** (`messages`, `squareSvg`), **15.4 Moderationstechniken**, **15.5 Maßnahmenplan**, **16 Anlagen** (Kapitel als Anlage im Bericht). `FormDef.figure` jetzt auch bei Tabelle/Einzelansicht (Grafik über den Feldern). Beispiele gefüllt: ColorGentlemen (Report S. 24–33) und Live-Projekt (`liveExtras` in `liveProject.ts`, Eisenhower aus ◐/○).
2. **Bearbeiten im Blatt + D3 (Enrico 12:59):** Kästen in Zielhierarchie, PSP, Organigramm haben `data-edit="formular:zeile"`; Klick/Enter öffnet `FigEditor` (ProjectForms) mit den Feldern des Formulars dahinter, „… darunter anlegen“, Löschen mit Rückgängig, Esc zurück zum Kasten. Ziehen mit der Maus bzw. Alt+Pfeile speichert `Project.figLayout[fig][key] = {dx,dy}` (Aktionen `figMove`/`figReset`), Linien folgen.
3. **Organigramm wie Abb. 7 (Enrico 13:15):** `ProjectRole.parent/kind/link/org`, `editRoles` Op `set` (keine Kreise, ungültig bleibt unverändert), Löschen hängt Untergeordnete eine Ebene höher, bis 40 Rollen; neues `orgChartSvg` mit Stabsstellen seitlich, Externen unter der Abgrenzung je Firma, Linienarten und Legende. CG-Beispiel mit 14 Rollen wie Abb. 7.
4. **UI (Enrico 13:00–13:17):** Kapitel-Rad ganz links, große Überschrift auf Radmitte (auch Projektname in der Liste, nachgemessen), Knöpfe über Grafiken links/rechts klein aufgeteilt, Stakeholder-Portfolio-Namen linksbündig, Quadrantennamen ohne Überdeckung, gerechnete Auswahlfelder zeigen ihren Text.
5. **F-236 neu:** Entscheidungs-Doc https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (PDF `docs/Arbeitspakete/F-236_V137_Farben_Layout-Generator.pdf`), Vorschlag B, Fragen G1–G8.
6. Handbuch V137 (7.1, Änderungsverzeichnis), Lastenheft F-234 ●, F-236 ◐, `APP_VERSION = 'V137'`, Live-Projekt auf V137 (160 F-Punkte, 40 Änderungen).

## Prüfliste für Enrico (zusätzlich zu V77–V136)

- ColorGentlemen › Formulare › **12.1 AP-Statusbericht**: Blatt wie Abb. 15 (CG-1.6.4, 18./19. KW, grün, 67 %); neuen Bericht für ein anderes Arbeitspaket anlegen.
- **15.1–15.5, 16** durchblättern: Belbin-Kreise, Eisenhower (Häkchen unten ändern die Matrix), Nachrichtenquadrat, Moderation, Maßnahmenplan, Anlagen; „Bericht“ zeigt die Abbildungen und am Ende „Anlage 1 … 5“.
- **2.2 Zielhierarchie / 8 PSP / 6.1 Organigramm:** Kasten anklicken → Felder am Ort ändern, „Unterziel“/„Arbeitspaket darunter“/„Rolle darunter“/„Stabsstelle“/„Externe Rolle“ anlegen, löschen + Rückgängig; Kasten ziehen, Alt+Pfeile, „Anordnung zurücksetzen“; nur Tastatur (Tab, Enter, Esc).
- Organigramm: Linienarten und Legende wie Abb. 7 passend?
- Live-Projekt (`?demo`): Kapitel 15/16 mit echten Inhalten (Übergabetext-Gespräch als Nachrichtenquadrat).
- Entscheidungs-Doc **F-236** beantworten.

## Kleine Punkte (neu in V137)

- Klick auf „Unterziel anlegen“ direkt nach dem Tippen in ein mehrzeiliges Feld ging einmal verloren (Blur speichert, Knopf-Klick fiel aus) – beobachten.
- Verschobene Kästen nehmen ihre Unterkästen nicht mit (jeder Kasten einzeln); bei Bedarf „Teilbaum mitziehen“.
- Organigramm: eine Rolle hat genau eine übergeordnete Rolle – zusätzliche fachliche Weisung (wie im Report PL → Gebietsleitung) ist noch nicht darstellbar (zweite Verbindung).
- AP-Statusbericht: QR-Code wie im Report fehlt (Link zur Karte); Unterschrift nur als Linie.
- Belbin-Grafik zeigt eine Person je Blatt; Team-Vergleich fehlt.
- `Projects/Claude outputs/tmp137/` enthält Prüf-SVGs (darf weg).

### Ältere offene Punkte

Unverändert in `V136_Uebergabe_E-Sources.md`, `V135_…`, `V134_…`, `V133_…`, `V132_…`, `V131_…`.

## Commit-Text V137 (e-sources)

**Summary:** `V137: AP-Statusbericht, Persönliche Kompetenzen und Anlagen wie im Report (F-234), Grafiken am Ort bearbeiten und verschieben, Organigramm wie Abb. 7`

**Description:**
```
- F-234: Kapitel 12.1 AP-Statusbericht (eingefroren, Blatt wie Abb. 15), 15.1 Teamrollen nach Belbin, 15.2 Eisenhower-Matrix, 15.3 Nachrichtenquadrat, 15.4 Moderationstechniken, 15.5 Maßnahmenplan, 16 Anlagen – auch im Bericht
- Beispiele gefüllt: ColorGentlemen aus dem Report, Live-Projekt aus der Zusammenarbeit
- Zielhierarchie, PSP, Organigramm: Kästen am Ort bearbeiten, darunter anlegen, löschen, mit Maus oder Alt+Pfeilen verschieben (D3)
- Organigramm wie Abb. 7: Hierarchie, Stabsstellen, externe Rollen je Firma, Linienarten und Legende
- Kapitel-Rad links, große Überschriften auf Radmitte, Knöpfe über Grafiken aufgeteilt, Stakeholder-Portfolio linksbündig
- F-236 Farben und Layout-Generator: Entscheidungs-Doc
- Tests +4 (734); Handbuch V137, Lastenheft F-234/F-236, APP_VERSION V137, Live-Projekt V137, Übergabe V137

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q7jx4f7fNb6PuntrwR
```
