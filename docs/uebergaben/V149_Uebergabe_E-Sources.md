# Übergabe V149 → V150 E-Sources

Stand: 28.11.2026 · Chat V149 · Nächster Chat: **V150 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V150 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-232/F-234 „Gebaut V149“** und „Gebaut V148“, **F-236**, **F-232** (P11–P14), **F-231 K14** und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64`, Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, Rev. 17). Stand V149: alle drei unbeantwortet, keine Kommentare. Beantwortet → Doc anpassen („io“), PDF erneuern, Lastenheft nachziehen, bauen (F-236 B schließt P11 ein). **Sonst erstes Paket V150 (kleine Punkte, Funktion vor Design):** im Browser prüfen, was V149 gebaut hat (Prüfliste unten, falls Enrico `npm run dev` gestartet hat); dann offene Punkte unten. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V149_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink qr`; im `run.sh` die Ausgabe gleich filtern (`| grep -E "grün|FAIL" | cut -c1-300`). Tests V149: **785** grün (`gpm` 80). `npx tsc --noEmit -p .` sauber (`timeout 170`, `timeout_ms: 180000`).

**Bericht als Bild prüfen:** Skript-Muster V149: kleines node-Skript in `$HOME/vt2/` lädt `workspace.js`, `sampleProject.js`, `gpmReport.js` (+ `feedback.js`, `decisions.js` für Beispiel-Meldung/-Entscheidung) aus `$HOME/vt2/out`, schneidet Abschnitte per `<section id="…">` aus (Anlagen: `an-fb`, `an-dc`), schreibt nach `Projects/Claude outputs/v149/`, stagen, im Container `google-chrome --headless --no-sandbox --print-to-pdf=… --no-pdf-header-footer file://…` und `pdftoppm -r 45 -png`.

**Browser:** `http://localhost:2910/` (Enrico startet `npm run dev`). Kapitel direkt: `?projekt=pj-cg&blatt=<Formular-Id>&zeile=<Eintrag-Id>`.

## Was in V149 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 (P11–P14) unbeantwortet (Rev. 6/6/17), keine Kommentare.
2. **Bericht 15.1 Teamrollen / 15.3 Nachrichtenquadrat** (Übergabe nannte sie 13.1/14.1): unter dem Blatt nur noch Felder, die das Blatt nicht zeigt – `SHEET_SHOWS` in `gpmReport.ts` (Belbin: Person + 9 Rollen; Quadrat: Anlass, Nachricht, Reaktion, acht Seiten). Darunter bleiben Datum/Reflexion bzw. Datum/Sender/Empfänger und eigene Felder.
3. **Anlagen im Bericht** (Enrico 28.11.: „Ja, als Anlage“): `annexSheets(ws, p)` – **Anlage A Problemstellungen** (Kopf wie das Blatt, Abschnitte aus `Fb.problemSheet`, Bilder als Anzahl, Spur) und **Anlage B Entscheidungsvorlagen** (Kopf, Matrix Kriterium | Gewicht | Lösungen mit Muss-Zeilen, Nutzwert, Rang, Empfehlung, gewählte Lösung, Begründung, Spur). Je Blatt eine Seite (`break-before`, `break-inside: avoid`), Einträge im Inhaltsverzeichnis, ohne Meldung/Entscheidung keine Anlage. Als PDF geprüft.
4. **Blatt Problemstellung:** Abschnitt „Bearbeitung und Spur“ (nur mit Schalter Bearbeitung, wie im Board-Fenster): „Behoben in“, Vermerk hinzufügen, Spur. Neu `MarkAdd` und `MarkTrail` in `FeedbackCard.tsx`, vom Board-Fenster und vom Blatt genutzt (NF-08); `FeedbackSheet` bekommt `ws`.
5. **Blatt Entscheidungsvorlage** (offen seit V140): „+ Kriterium“ unter den Gewichten, „+ Lösung“ unter der Bewertung (Name danach markiert), Namen direkt in der Zelle (`NameIn`); gesperrt nach „Entschieden“. Entfernen/Muss weiter im Werkzeug.
6. Handbuch 7, 8, 9 (+ Stand V149, Änderungsverzeichnis); Lastenheft F-232/F-234 „Gebaut V149“; `APP_VERSION = 'V149'`; Live-Projekt V149 (206 F-Punkte, 3 ersetzt, 129 fertig, 26 teilweise, 48 offen). Tests +2 (785).

## Prüfliste für Enrico (zusätzlich zu V77–V148)

- **Bericht** › PDF: 15.1 Teamrollen und 15.3 Nachrichtenquadrat – unter dem Blatt keine Punkte bzw. Sach-/Beziehungsebenen mehr, nur Datum/Reflexion bzw. Datum/Sender/Empfänger.
- **Bericht** mit mindestens einer Meldung und einer Entscheidung am Projekt: am Ende **Anlage A Problemstellungen** und **Anlage B Entscheidungsvorlagen**, je Blatt eine Seite, beide im Inhaltsverzeichnis anklickbar.
- Projekt › Meldungen › Darstellung **Blatt**, Schalter **Bearbeitung** im Cockpit an: unten „Bearbeitung und Spur“ – „Behoben in“ eintragen, Vermerk hinzufügen (Enter), Eintrag erscheint oben in der Spur; Meldung am Feld. Bearbeitung aus → Abschnitt fehlt.
- Projekt › Entscheidungen › Darstellung **Blatt**: „+ Kriterium“ und „+ Lösung“ – Name ist markiert, überschreiben, Enter; Namen in der Tabelle ändern; nach „Entschieden“ keine Knöpfe.

## Kleine Punkte (neu in V149)

- Anlage A zeigt Bilder nur als Anzahl („im Gerät gespeichert“) – Bilder liegen im Gerätespeicher, der Bericht wird synchron gebaut. Bei Bedarf: Bilder vor dem Öffnen des Berichts laden und als Daten-URL einbetten.
- Anlage A zeigt die Spur auch ohne Schalter Bearbeitung (Bericht = Sicht der Projektleitung). Falls Enrico das anders will: Spur nur mit Bearbeitung.
- Blatt Entscheidungsvorlage: Kriterien/Lösungen **entfernen** und **Muss** setzen nur im Werkzeug.
- `Projects/Claude outputs/v149` (und `v148`, `v147`, `tmp142`, `v146`) löschen – Freigabe nötig.
- Unverändert offen: Umwandeln über Apple-Texterkennung/Dienst (NF-01), Tinte gerätegebunden, Fußzeile in Browsern ohne Seitenrand-Felder, F-211 (Rechte/Server), F-234 ●/◐ im Lastenheft angleichen (Enrico entscheidet). AP-Statusbericht im Bericht ohne „Unterschrift AP-V“ (wie Abb. 15).

### Ältere offene Punkte

V141: Regel-Auslöser „Notiz kommt in den Eingang“ und Tour um den Eingang (hängt an K14); Entwürfe zählen im Eingang erst nach dem Speichern (hängt an K14). V140/V139: eigene Reihenfolge im Eisenhower-Feld (mit Enrico klären). Sonst unverändert in `V148_…` bis `V131_…`.

## Commit-Text V149 (e-sources)

**Summary:** `V149: Bericht mit Anlagen Problemstellungen/Entscheidungsvorlagen, 15.1/15.3 ohne doppelte Felder, Spur und Kriterien auf den Blättern`

**Description:**
```
- Bericht: 15.1 Teamrollen und 15.3 Nachrichtenquadrat zeigen unter dem Blatt nur Felder, die das Blatt nicht zeigt (SHEET_SHOWS)
- Bericht: Anlage A Problemstellungen und Anlage B Entscheidungsvorlagen (annexSheets), je Blatt eine Seite, im Inhaltsverzeichnis
- Blatt Problemstellung: „Bearbeitung und Spur“ mit Behoben in, Vermerk hinzufügen und Spur (MarkAdd/MarkTrail gemeinsam mit dem Board-Fenster)
- Blatt Entscheidungsvorlage: Kriterien und Lösungen anlegen und direkt in der Zelle benennen
- Tests 785 (+2); Handbuch V149, Lastenheft F-232/F-234, APP_VERSION V149, Live-Projekt V149, Übergabe V149

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q79QSDdb98iQQzcsig
```
