# Übergabe V150 → V151 E-Sources

Stand: 28.11.2026 · Chat V150 · Nächster Chat: **V151 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V151 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-232 „Gebaut V150“**, „Gebaut V149“, **F-236**, **F-232** (P11–P14), **F-231 K14** und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64`, Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, Rev. 17). Stand V150: alle drei unbeantwortet, keine Kommentare. Beantwortet → Doc anpassen („io“), PDF erneuern, Lastenheft nachziehen, bauen (F-236 B schließt P11 ein). **Sonst erstes Paket V151 (kleine Punkte, Funktion vor Design):** offene Punkte unten; Meldungs-Teil der Prüfliste V149 braucht eine Meldung am Projekt (Enrico prüft selbst, keine Testdaten in seinem Browser anlegen). **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V150_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink qr`; im `run.sh` die Ausgabe gleich filtern (`| grep -E "grün|FAIL" | cut -c1-300`). Tests V150: **786** grün (`workspace` 528, `gpm` 80). `npx tsc --noEmit -p .` sauber (`timeout 170`, `timeout_ms: 180000`).

**Browser:** `http://localhost:2910/` (Enrico startet `npm run dev`). Kapitel direkt: `?projekt=pj-cg&blatt=<Formular-Id>&zeile=<Eintrag-Id>`. Ansichten (Meldungen, Entscheidungen …) nur über das Rad: `getByRole('slider', {name: 'Ansicht des gewählten Projekts'})` fokussieren, Pfeiltasten. **Snapshots sind riesig** – nicht `tabs.getActive()` erneut aufrufen, sondern die Variable `tab` weiterverwenden und gezielt `innerText`/`evaluate` lesen. Entscheidungen › „Beispiel ansehen“ legt eine echte Entscheidung an – danach wieder löschen („Entscheidung löschen“). Die Knöpfe „+ Kriterium“/„+ Lösung“ heißen im Namen nur „Kriterium“/„Lösung“ (Plus ist ein Symbol).

## Was in V150 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 (P11–P14) unbeantwortet (Rev. 6/6/17), keine Kommentare.
2. **V149 im Browser geprüft (Entscheidungsvorlage › Blatt):** „+ Kriterium“/„+ Lösung“ legen an, Name markiert, Enter speichert, Meldung am Feld. **Mangel gefunden und behoben:** Lösungsnamen in der Bewertung wurden abgeschnitten („Malermeis“), Spaltenköpfe liefen ineinander. `NameIn` (PaperDocs.tsx) ist jetzt ein mitwachsendes `textarea` (eine Zeile, bricht um, Enter speichert), `.paper__matrix` mit `overflow-wrap`/`hyphens` und erster Spalte 24 %.
3. **Entfernen und Muss auf dem Blatt** (kleiner Punkt V149): unter jedem Kriterium „Muss“ und ✕, bei den Muss-Kriterien „Gewichten“ und ✕, unter jeder Lösung ✕. Entfernen mit Meldung am Ort und **Rückgängig** – neuer Schritt `{ op: 'back', prev }` in `decisions.ts` (nur dieselbe, nicht gesperrte Entscheidung; Spur bleibt). `useFieldMsg` kann jetzt einen Rückgängig-Knopf zeigen. Knöpfe nur am Bildschirm (`@media print`).
4. Handbuch 9 (+ Stand V150, Änderungsverzeichnis); Lastenheft F-232 „Gebaut V150“; `APP_VERSION = 'V150'`; Live-Projekt V150 (206 F-Punkte, 3 ersetzt, 129 fertig, 26 teilweise, 48 offen). Tests +1 (786). Portfolio „Aktuell“ unverändert (nichts Neues fürs Portfolio).

## Prüfliste für Enrico (zusätzlich zu V77–V149)

- Projekt › Entscheidungen › Darstellung **Blatt**: lange Lösungsnamen (z. B. „Malermeister Petersen“) stehen ganz in ihrer Zelle, Spaltenköpfe überlappen nicht.
- Unter einem Kriterium **„Muss“** → es steht oben bei den Muss-Kriterien; dort **„Gewichten“** → zurück in die Tabelle (Gewicht leer, eintragen).
- **✕** unter einer Lösung → Meldung „… entfernt – mit ihren Bewertungen“ mit **Rückgängig** direkt daneben; Rückgängig holt Lösung und Bewertungen zurück. Gleiches für Kriterien.
- Drucken/PDF des Blatts: die kleinen Knöpfe erscheinen nicht.
- Weiter offen aus V149: Meldungen › Blatt › „Bearbeitung und Spur“ (braucht eine Meldung am Projekt), Bericht mit Anlage A/B.

## Kleine Punkte (neu in V150)

- Blatt Entscheidungsvorlage: Reihenfolge der Kriterien/Lösungen ändern (↑↓) weiter nur im Werkzeug.
- „Gewichten“ setzt das Gewicht leer – ggf. Vorschlag (Rest bis 100 %) vorbelegen.
- Unverändert aus V149: Bilder in Anlage A nur als Anzahl; Spur in Anlage A auch ohne Bearbeitung (Enrico entscheidet); `Projects/Claude outputs/v149` usw. löschen (Freigabe nötig); NF-01, Tinte gerätegebunden, Fußzeile ohne Seitenrand-Felder, F-211, F-234 ●/◐ angleichen.

### Ältere offene Punkte

V141: Regel-Auslöser „Notiz kommt in den Eingang“ und Tour um den Eingang (hängt an K14); Entwürfe zählen im Eingang erst nach dem Speichern (hängt an K14). V140/V139: eigene Reihenfolge im Eisenhower-Feld (mit Enrico klären). Sonst unverändert in `V149_…` bis `V131_…`.

## Commit-Text V150 (e-sources)

**Summary:** `V150: Blatt Entscheidungsvorlage – Entfernen mit Rückgängig, Muss umschalten, lange Namen brechen um`

**Description:**
```
- Blatt Entscheidungsvorlage: Kriterien und Lösungen entfernen, Meldung am Ort mit Rückgängig (neuer Schritt back in decisions.ts)
- Blatt Entscheidungsvorlage: Muss an/aus direkt am Kriterium bzw. bei den Muss-Kriterien
- Namen in der Zelle als mitwachsendes Feld; Spaltenköpfe der Bewertung mit Silbentrennung – nichts läuft mehr über den Rand
- Tests 786 (+1); Handbuch V150, Lastenheft F-232, APP_VERSION V150, Live-Projekt V150, Übergabe V150

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q7b62Hk3rCW7iA2RRA
```
