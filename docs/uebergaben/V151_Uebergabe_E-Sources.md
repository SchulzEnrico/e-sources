# Übergabe V151 → V152 E-Sources

Stand: 28.11.2026 · Chat V151 · Nächster Chat: **V152 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V152 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-232 „Gebaut V151“**, „Gebaut V150“, **F-236**, **F-232** (P11–P14), **F-231 K14** und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64`, Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, Rev. 17). Stand V151: alle drei unbeantwortet, keine Kommentare. Beantwortet → Doc anpassen („io“), PDF erneuern, Lastenheft nachziehen, bauen (F-236 B schließt P11 ein). **Sonst erstes Paket V152 (kleine Punkte, Funktion vor Design):** zuerst **Browser-Blick auf V150/V151** (Blatt Entscheidungsvorlage: ↑↓, Gewichten mit Vorschlag, ✕ mit Rückgängig – in V151 nicht im Browser geprüft; Beispiel ansehen legt eine echte Entscheidung an, danach löschen), dann offene Punkte unten. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Browser-Hinweise `V150_…`, kleine Punkte aus `V74_`–`V151_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink qr`; Ausgabe filtern (`| grep -E "grün|FAIL|==" | paste - -`). Tests V151: **787** grün (`workspace` 529, `gpm` 80). `npx tsc --noEmit -p .` sauber (`timeout 170`, `timeout_ms: 180000`).

## Was in V151 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 (P11–P14) unbeantwortet (Rev. 6/6/17), keine Kommentare.
2. **„Gewichten“ mit Vorschlag** (kleiner Punkt V150): `Dc.restWeight(d, c)` = Rest bis 100 % aus den übrigen gewichteten Kriterien (≤ 0 → `null`, Feld bleibt leer). `setMust` in `DecisionSheet` schickt danach `critWeight`, Meldung `T.mustOffRest`, Fokus ins Gewichtsfeld (`data-weight`).
3. **Reihenfolge ↑↓ auf dem Blatt** (kleiner Punkt V150): `Dc.stepIndex(all, within, id, dir)` liefert den Ziel-Index im ganzen Feld; Kriterien werden nur unter den gewichteten verschoben (Muss übersprungen), Lösungen frei. Pfeile in `.paper__rowtools` vor „Muss“/✕, Randpfeile `disabled` (CSS), Meldung am Ort (`T.movedUp/movedDown`), Fokus bleibt auf dem Pfeil (`data-step`). Nur am Bildschirm (`@media print` wie V150).
4. Handbuch (Stand V151, Änderungsverzeichnis); Lastenheft F-232 „Gebaut V151“; `APP_VERSION = 'V151'`; Live-Projekt V151 (206 F-Punkte, 3 ersetzt, 129 fertig, 26 teilweise, 48 offen). Tests +1 (787). Portfolio „Aktuell“ unverändert.

## Prüfliste für Enrico (zusätzlich zu V77–V150)

- Projekt › Entscheidungen › Darstellung **Blatt**: bei einem Muss-Kriterium **„Gewichten“** → Gewicht steht schon als Rest bis 100 % drin, Cursor im Feld, Meldung nennt den Vorschlag; Summe zeigt 100 %.
- Unter Kriterien und Lösungen **↑ / ↓** → Zeile wandert eine Stelle, Spalten der Bewertung ziehen mit; oberste ↑ und unterste ↓ ausgegraut; mit Tab auf den Pfeil und Enter mehrfach schieben.
- Weiter offen aus V150: lange Namen, ✕ mit Rückgängig, Druck ohne Knöpfe; aus V149: Meldungen › Blatt › „Bearbeitung und Spur“, Bericht mit Anlage A/B.

## Kleine Punkte

- Unverändert aus V149/V150: Bilder in Anlage A nur als Anzahl; Spur in Anlage A auch ohne Bearbeitung (Enrico entscheidet); `Projects/Claude outputs/v149` usw. löschen (Freigabe nötig); NF-01, Tinte gerätegebunden, Fußzeile ohne Seitenrand-Felder, F-211, F-234 ●/◐ angleichen.
- Neu: Vorschlag beim Gewichten auch im Werkzeug (Schritt Kriterien) anbieten – NF-08 „gleicher Aufbau“.

### Ältere offene Punkte

V141: Regel-Auslöser „Notiz kommt in den Eingang“ und Tour um den Eingang (hängt an K14); Entwürfe zählen im Eingang erst nach dem Speichern (hängt an K14). V140/V139: eigene Reihenfolge im Eisenhower-Feld (mit Enrico klären). Sonst unverändert in `V149_…` bis `V131_…`.

## Commit-Text V151 (e-sources)

**Summary:** `V151: Blatt Entscheidungsvorlage – Gewichten mit Vorschlag, Reihenfolge ↑↓`

**Description:**
```
- Blatt Entscheidungsvorlage: „Gewichten“ belegt das Gewicht mit dem Rest bis 100 % vor (Dc.restWeight), Fokus ins Feld, Meldung am Ort
- Blatt Entscheidungsvorlage: Kriterien und Lösungen mit ↑/↓ verschieben (Dc.stepIndex, Muss-Kriterien übersprungen), Fokus bleibt auf dem Pfeil
- Tests 787 (+1); Handbuch V151, Lastenheft F-232, APP_VERSION V151, Live-Projekt V151, Übergabe V151

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q4Fsmxo4kXojsQBsy4
```
