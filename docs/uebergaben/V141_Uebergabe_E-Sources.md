# Übergabe V141 → V142 E-Sources

Stand: 27.11.2026 · Chat V141 · Nächster Chat: **V142 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V142 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231 K14** (neu: „Gebaut V141“), **F-230 F7** („Gebaut V141“), den **Nachtrag V141 zu F-232/F-234** (Portfolios wie Eisenhower), **F-233** (jetzt ⇢, entfernt), **F-236** und **F-232** (P11–P14 weiter offen) und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug: erst `read` mit `ref {object: project, id}`, das liefert Tab-Id; dann `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64` lesen; Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6, leer – **gebaut nach Vorschlag A**; antwortet Enrico abweichend, nachbauen), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, G1–G8, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, P11–P14, Rev. 17). Beantwortet → Doc anpassen („io“ = Vorschläge eintragen), PDF unter `docs/Arbeitspakete/` erneuern, Lastenheft nachziehen, bauen. **Erstes Paket V142:** Enrico (14:58) „Achte auch bei anderen Formularen darauf, dass sie wie im Report aussehen“ – alle Formulare/Grafiken der Ansicht „Formulare“ mit dem Report vergleichen und angleichen (Vorbild: Eisenhower-Matrix, jetzt auch die Portfolios). **Danach** F-236 bzw. F-232 P11–P14, sobald beantwortet; sonst kleine Punkte. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, Retro-Designs: Bedienelemente im Stil des Systems, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V141_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, **Testliste um `inbox tableFiles` ergänzen** (… `schedule watch inbox tableFiles`). Tests V141: **748** grün (`gpm` 61, `workspace` 528, `inbox` 4, `tableFiles` 4). `npx tsc --noEmit -p .` sauber (mit `timeout 170`, `timeout_ms: 180000`).

**Grafiken als Bild prüfen:** wie V140; Skript: `const Sp=require('./sampleProject'),W=require('./workspace'),Fg=require('./gpmFigures'),C=require('./gpmCalc')`, ColorGentlemen anlegen, `Fg.shPortfolioSvg(p, C.portfolioOf(p), day, all)` bzw. `envPortfolioSvg`, SVG nach `Projects/Claude outputs/tmp142/`, `device_stage_files`, im Container `rsvg-convert`. Danach tmp-Ordner wieder löschen (Löschen braucht `device_request_delete_permission`).

**Browser:** wie V138.

## Was in V141 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 unbeantwortet, keine Kommentare.
2. **K14 Eingang gebaut (Vorschlag A, I1–I9)** – `workspace/inbox.ts`, `components/ParkingLot.tsx`; Details Lastenheft „F-231 K14 Gebaut V141“. Gedankenparkplatz **Alt/⌥+E** (war frei).
3. **Future Proof raus (Enrico 14:51):** `sampleLogistics.ts` gelöscht (Löschfreigabe erteilt), `SampleKey = 'cg'`, Tests ersetzt; `samples.dropRetiredSamples` entfernt ein gespeichertes `pj-fp` beim Laden (`ensureAll` in useWorkspace). Lastenheft F-233 = ⇢. Live-Projekt: 205 F-Punkte, 3 ersetzt, 128 fertig, 25 teilweise, 49 offen.
4. **F-230 F7 gebaut:** `workspace/tableFiles.ts` – CSV/Excel und iCal hin und zurück, in „Exportieren …“/„Importieren …“.
5. **Portfolios wie Eisenhower (Enrico 14:58–15:04):** `envPortfolioSvg`/`shPortfolioSvg` in `gpmFigures.ts` (Formular und Bericht), linksbündige Listen, Stakeholder mit „Einstellung · Macht · Konflikt“ (Frage „warum zwei Kreise größer?“ = Konfliktpotenzial 3), Rad „Einträge“ Gekürzt · Alle (teilt sich `esource.eisenAll.v1` mit der Matrix), Spalte intern/extern im Stakeholder-Portfolio. Alte `shSvg`/`envSvg` in `gpmReport.ts` jetzt ungenutzt.
6. Nebenbei: gpm-Test „zählt alle F-Punkte“ stand seit V140 falsch (202 statt 203) – jetzt 202 nach F-233 ⇢. tmp137/138/140/141 in `Claude outputs` gelöscht.
7. Handbuch V141 (5, 7.1 Portfolios, 7.3, 12, Änderungsverzeichnis), Hilfe `inbox`, `projectExchange`, Begriffe `inbox`, `parkingLot`, `APP_VERSION = 'V141'`, Live-Projekt V141.

## Prüfliste für Enrico (zusätzlich zu V77–V140)

- **Alt/⌥+E** auf dem Desk, im Pad, im Projekt-Modus → Feld oben mittig; Text, Enter → Meldung „… liegt im Eingang (n)“ mit Rückgängig, Fokus wieder dort, wo er war; Umschalt+Enter = neue Zeile; Esc schließt.
- Knopf **„Notizen & Aufgaben“**: Zahl am Knopf, Einträge „Eingang (n)“ und „Gedankenparkplatz“. Eingang öffnen → Reiter mit Ablagekasten, Zahl, Stern.
- Im Eingang Taste **V** auf einem Eintrag → Sheets, Eisenhower-Matrizen und Gruppe „Projekte“; ins Projekt → wird Vorgang, Rückgängig.
- Eingang umbenennen (Doppelklick auf den Reiter); Reiter schließen → Eingang bleibt erhalten; leerer Eingang zeigt „Eingang leer – alles einsortiert“.
- Neue Notiz im Portal (leerer Tab bzw. Portal-Menü) und über den Knopf im Pad (Wischen) → steht auch im Eingang; „+“ im To-do/Kanban nicht.
- Cockpit „Notizen“: Zeile „Eingang“ über den Matrizen.
- ColorGentlemen › Steckbrief „Exportieren …“ → **Excel / Tabelle (CSV)** in Excel/Numbers öffnen; **Kalender (iCal)** im Kalender öffnen; beide Dateien wieder importieren.
- Kapitel 4 **Umfeld-** und **Stakeholder-Portfolio**: Aussehen wie Eisenhower, Rad „Einträge“, Spalte intern/extern.
- ⚙ bzw. Projektliste: nur noch „ColorGentlemen“, kein Logistik-Center.

## Kleine Punkte (neu in V141)

- CSV-Import führt gleichnamige Personen still zusammen (F5 fragt bei XML/Trello nach) – ggf. Rückfrage wie bei XML.
- Regel-Auslöser „Notiz kommt in den Eingang“ (K10a) und Tour „Notizen & Aufgaben“ um den Eingang fehlen noch; F-109 „Wo war ich?“ könnte offene Gedanken zeigen.
- `gpmReport.ts` `shSvg`/`envSvg` und in `ProjectForms.tsx` evtl. `UI_COLORS`-Import für Portfolios ungenutzt – aufräumen.
- Filter intern/extern im Portfolio nur, wenn Enrico das statt der Tabellenspalte meinte (gefragt im Chat).
- Eingang wird bei Notizen, die über den Pad-Knopf als Entwurf entstehen, erst nach dem Speichern gezählt (Entwürfe zählen nicht).
- Kleine Punkte aus V140/V139 bleiben offen.

### Ältere offene Punkte

Unverändert in `V140_Uebergabe_E-Sources.md`, `V139_…` bis `V131_…`.

## Commit-Text V141 (e-sources)

**Summary:** `V141: Eingang mit Gedankenparkplatz (K14), Export/Import Excel und iCal (F-230 F7), Portfolios wie Eisenhower, Future Proof entfernt`

**Description:**
```
- F-231 K14 (Vorschlag A): festes To-do-Sheet „Eingang“ (nicht löschbar, Stern), Gedankenparkplatz Alt/⌥+E, Knopf im Pad und „Neue Notiz“ im Portal legen dort ab, V sortiert in Sheets, Eisenhower-Matrizen und Projekte, Zähler am Reiter, im Cockpit und am Knopf „Notizen & Aufgaben“
- F-230 F7: Projekt als Excel-Tabelle (CSV) und Kalender (iCal) exportieren und importieren
- Stakeholder- und Umfeld-Portfolio im Aussehen der Eisenhower-Matrix, linksbündig, Rad „Einträge“, Spalte intern/extern
- Beispiel FUTURE-P.ROOF (Logistik-Center) ganz entfernt, gespeicherte Reste fallen beim Laden weg
- Tests 748 (+8 inbox/tableFiles, Logistik-Tests ersetzt); Handbuch, Hilfe, Lastenheft, APP_VERSION V141, Live-Projekt V141, Übergabe V141

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q3gfmJh3Zqow165UA7
```
