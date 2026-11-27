# Übergabe V136 → V137 E-Sources

Stand: 27.11.2026 · Chat V136 · Nächster Chat: **V137 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V137 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-234** („Gebaut V135“, „Abgleich ColorGentlemen V135“, „Nachtrag V135“), **F-235** („Gebaut V136“), **F-232** (P11–P14 weiter offen) und **F-227** (Handbuch). **Erstes Paket V137: F-234 Rest** – neue Formulare im Aussehen des ColorGentlemen-Reports: AP-Statusbericht (je AP, eingefroren), Teamrollen (Belbin), Eisenhower (aus wichtig/dringend), Nachrichtenquadrat, Maßnahmenplan/Moderation, Anlagen; beide Beispiele (ColorGentlemen + Live-Projekt) füllen; D3 „Anordnung von Hand verschiebbar“. Dann F-232 P11–P14 (wenn beantwortet), Rest P9, K14 Eingang, F-230 F7. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **bei Dokumenten Aussehen wie im Report**, **Funktion vor Design**, **Retro-Designs: Bedienelemente im Stil des Systems, Räder gleich**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V136_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Prüfdateien (F9) erst ab 07.12.** **Dashboards** zählen wie V127 (F-234 ◐, F-235 ● neu). Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl unverändert aus `V135_Uebergabe_E-Sources.md`. Tests V136: **730** grün (`gpm` 50, `workspace` 528). `npx tsc --noEmit -p .` sauber (mit `timeout 170`, `timeout_ms: 180000`).

**Dateien:** neue Dateien direkt mit `device_bash` (`cat > … <<'EOF'`), Änderungen per Python `str.replace` mit `assert`. **`device_commit_files` beim Überschreiben meiden** – V136 wieder bestätigt: beim Überschreiben kam die alte Fassung an; Umweg: unter neuem Namen ablegen und auf dem Rechner mit `mv` umbenennen. (Übertragene PNGs haben andere Prüfsummen durch angehängte Metadaten – Bildinhalt per Pixel vergleichen.)

**Browser:** wie V135. **Neu V136:** `?demo` in der Adresse schaltet beim Entwickeln den Schreibschutz ein (`http://localhost:2910/?test=voll&demo`) – das Live-Projekt wird dann von selbst angelegt. Rad „Ansicht des gewählten Projekts“ (Name genau so), Rad „Kapitel“: `End`, dann `ArrowUp` bis „13 Veränderung“ (je ~0,7 s).

## Was in V136 passiert ist

1. **F-235 Schreibschutz (fertig):** zentral im Reducer (`useWorkspace.ts`, `Lv.keepLive`, Ausnahmen `LIVE_FREE`: remote, replace, exchange, liveProject). Geschützt: Projekt `pj-es`, Notizen `es-n-…` und alle am Projekt, Meldungen und Entscheidungen am Projekt. Abgewiesene Teile werden zurückgelegt, der Rest der Aktion gilt. Eingeschaltet in `main.tsx` (`!import.meta.env.DEV || ?demo`). Hinweis am Ort `LiveLockNote` (ProjectCockpit) mit Meldung „Nicht gespeichert …“ (2,5 s, role=status) und **„Kopie anlegen“** (`copyLiveProject`, Aktion `liveCopy`, Ids `pj-esk<n>`, Eltern/Vorgänger/Ordnung/Basisplan umgestellt). Demo legt das Live-Projekt selbst an bzw. erneuert es, wenn `Project.live` ≠ Stand (App.tsx); Knopf „Live-Projekt E-Sources ansehen“. Im Browser geprüft: Anlegen im PSP abgewiesen, Meldung am Ort.
2. **F-235 L7 (fertig):** `tools/live_project.py` liefert je F-Punkt `day`/`base` und `LIVE_CHANGES` (39 Änderungen: je Abschnitt+Tag, bei „Notizen und Ansichten“ je F-Punkt; Erzähltexte `STORY`/`STORY_F`). Projekt: Basisplan nur F-01…F-99 (Lastenheft 20.11.2026), je Änderung Antrag Ä-n (genehmigt, Datum, Anlass, Mehraufwand, Termin +AT) und Zeile in **Kapitel 13 „Veränderung“** (`project.changes`); Ziele L1 (Basisplan), L2 (Notizen, seit Ä-10), L3 (Projekt-Modus, seit Ä-30), L4 (alle Änderungen); Steckbrief/Business Case erzählen „aus einer kleinen Vision eine bessere Version von allem“. Im Browser geprüft (Kapitel 13).
3. **Bildschirmhintergrund (Enrico 12:31–12:39):** nur das ES-Zeichen, neutral dunkel wie die Portfolio-Seite (#0c0c0f), Wasserringe wie von einem Stein mit Glanz wie jQuery Ripples; 5K, MacBook, Ultrawide in `docs/Hintergrund/` (und `Projects/Claude outputs`), Skript `tools/wallpaper.py` (braucht rsvg-convert, numpy, Pillow – auf Enricos Mac fehlt rsvg-convert).
4. Handbuch V136 (7, Änderungsverzeichnis), Lastenheft F-235 ●, `APP_VERSION = 'V136'`, Live-Projekt auf V136.

## Prüfliste für Enrico (zusätzlich zu V77–V135)

- `npm run dev`, dann `http://localhost:2910/?demo`: Live-Projekt ist von selbst da; Hinweis „Live-Projekt – nur zum Ansehen“; etwas ändern (Vorgang anlegen, Feld) → „Nicht gespeichert“ am Ort, nichts ändert sich; „Kopie anlegen“ → „E-Sources (Kopie)“ frei bearbeitbar.
- Live-Projekt › Ansicht „Änderungen“: Ä-1 … Ä-39 mit Anlass und Auswirkung; Formulare › Kapitel 13; Soll-Ist zeigt Dazugekommenes als neu; Ziele L1–L4.
- Ohne `?demo` (Entwickeln): alles am Live-Projekt bearbeitbar, Knopf „Live-Projekt aktualisieren“.
- Hintergrundbilder in `docs/Hintergrund/` passend?

## Kleine Punkte (neu in V136)

- Abgewiesene Änderung: Bildschirmleser hört zusätzlich die eigene Erfolgsmeldung der Ansicht (z. B. PSP „… angelegt“). Sauber wäre, dass Ansichten im geschützten Projekt ihre Erfolgsmeldung nicht sagen (z. B. `liveLocked()` in `say` prüfen).
- Ansichten des geschützten Live-Projekts zeigen Eingabefelder weiter als bearbeitbar; ggf. später `readOnly` zeigen (Funktion steht).
- `tools/wallpaper.py` legt temporäre Dateien im Systemordner an; Hintergründe nur bei Logo-Änderung neu erzeugen.

### Ältere offene Punkte

Unverändert in `V135_Uebergabe_E-Sources.md`, `V134_…`, `V133_…`, `V132_…`, `V131_…`.

## Commit-Text V136 (e-sources)

**Summary:** `V136: Live-Projekt in der Demo schreibgeschützt mit Kopie, Basisplan und Änderungen (F-235 L7), ES-Bildschirmhintergründe`

**Description:**
```
- F-235: Schreibschutz für das Live-Projekt in der Online-Demo – zentral im Reducer (keepLive), Hinweis und Meldung am Ort, „Kopie anlegen“; Demo legt das Live-Projekt selbst an; beim Entwickeln mit ?demo prüfbar
- F-235 L7: Basisplan mit ursprünglichem Umfang, 39 Änderungen als genehmigte Anträge Ä-n und in Kapitel 13, Ziele L1–L4, Erzählung „aus einer kleinen Vision eine bessere Version von allem“ (Generator tools/live_project.py)
- Bildschirmhintergründe mit dem ES-Zeichen und Wasserringen (docs/Hintergrund, tools/wallpaper.py)
- Tests +2 (730); Handbuch V136, Lastenheft F-235, APP_VERSION V136, Übergabe V136

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q5y5JB4Uu1CAPmCjQL
```
