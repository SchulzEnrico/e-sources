# Übergabe V148 → V149 E-Sources

Stand: 28.11.2026 · Chat V148 · Nächster Chat: **V149 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V149 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-232/F-234 „Gebaut V148“** (Abgleich 8.3/12/12.1/14), den Nachtrag V142 („Gebaut V147“), **F-230 F7** (Gebaut V148), **F-237**, **F-236**, **F-232** (P11–P14), **F-231 K14** und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64`, Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, Rev. 17). Stand V148: alle drei unbeantwortet, keine Kommentare. Beantwortet → Doc anpassen („io“), PDF erneuern, Lastenheft nachziehen, bauen (F-236 B schließt P11 ein). **Sonst erstes Paket V149 (kleine Punkte, Funktion vor Design):** übrige Record-Formulare mit Blatt (13.1 Teamrollen, 14.1 Nachrichtenquadrat) im Bericht auf doppelte Feldlisten prüfen wie 12/12.1 in V148; Problemstellung: Vermerke/Spur auf dem Blatt; danach Feedback-/Entscheidungsblätter im Projektbericht (Anlage?) – vorher kurz fragen, ob das gewünscht ist. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, Retro-Designs: Bedienelemente im Stil des Systems, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V148_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink qr`. Testersatz wartet `async`-Tests ab (seit V147). Tests V148: **783** grün (`workspace` 527, `gpm` 78, `tableFiles` 5, `qr` 7). `npx tsc --noEmit -p .` sauber (`timeout 170`, `timeout_ms: 180000`; Tests und tsc in getrennten Aufrufen). Ausgabe der Tests nur gefiltert lesen (`grep -E "grün|FAIL"`, `cut -c1-300`) – ein roter Bericht-Test gibt sonst das ganze HTML aus.

**Bericht als Bild prüfen:** wie V147 – per node aus `$HOME/vt2/out` (`reportHtml` mit `addSampleProject`, Abschnitte per `<section id="f-…">` ausschneiden) nach `Projects/Claude outputs/v148/` schreiben, stagen, im Container `google-chrome --headless --no-sandbox --print-to-pdf=… --no-pdf-header-footer file://…` und `pdftoppm -r 70 -png`.

**Browser:** `http://localhost:2910/` (Enrico startet `npm run dev`). Kapitel direkt: `?projekt=pj-cg&blatt=<Formular-Id>&zeile=<Eintrag-Id>` (z. B. `blatt=wp&zeile=cg-31`). Enricos lokales ColorGentlemen ist ein älterer Stand (dort Sachmittel/Aktivitäten leer); das Beispiel im Code ist aktuell.

## Was in V148 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 (P11–P14) unbeantwortet (Rev. 6/6/17), keine Kommentare.
2. **8.3 Arbeitspaketbeschreibung wie Abb. 11** – am Bildschirm und im Bericht/PDF dieselbe Anordnung. Neu `workspace/wpSheet.ts` (`wpView`, `staffLines`): Projektname mit Untertitel, Teilaufgabe (übergeordneter PSP-Knoten), Projektleiter (wie `charterView`), Dauer in Monaten bzw. Arbeitstagen, Vorgänger/Nachfolger aus dem Netzplan, Personal aus den Einsätzen. Bericht: `wpSheetHtml` in `gpmReport.ts` (QR-Kopf im Blatt, vier Spalten, Chancen/Risiken über drei Zeilen neben Start/Ende/Dauer, Personal mit Arbeitsaufwand/Personalkosten neben Sachmittel, Anlagen neben Fortschrittsmessung + Fertigstellungsgrad, Freigabe PL links / AP-V rechts, `break-inside: avoid` – je AP eine Seite). Bildschirm: `WP_SHEET` in `ProjectForms.tsx` mit gerechneten Zeilen (Schlüssel mit „=“, rot ohne Eingabe, mit Herkunftshinweis). Im Browser und als PDF geprüft.
3. **Neue Felder Sachmittel und Anlagen** (`NoteWp.material`, `NoteWp.annex`, `parseWp`), `FIELDS.wp` in Report-Reihenfolge und -Bezeichnungen (AP Bezeichnung, AP.Nr. (PSP CODE), Verantwortlicher, Start, Ende, Chancen/Risiken, Voraussetzungen, Ergebnisse, Arbeitsaufwand (Ph), Personalkosten (€) …), „Ziel und Inhalt“ als Ergänzung nach ICB4 darunter. Beispiel CG-1.6.4: Voraussetzungen-Text entfernt (kommen aus dem Netzplan), Sachmittel und „Anlagen: keine“ wie Abb. 11.
4. **12/12.1 im Bericht:** keine zweite Feldliste mehr unter dem Blatt (Abb. 15 zeigt alles samt Unterschrift; `SHEET_HAS_ALL`), nur eigene Felder. **14 Projektabschluss** (kein Vorbild im Report): Zeile „Abnahme“ mit „Datum, Abnahme Auftraggeber“ (Abnahme durch/am) und „Datum, Unterschrift Projektleitung“. **Freigabe-Zeilen** überall mit „Datum“ als Platzhalter wie im Report (kleiner Punkt V147 damit erledigt).
5. **CSV-Import gleichnamige Personen** (offen seit V141): `csvNameClashes`, `importCsv(…, { merge })` – Rückfrage im selben Dialog wie XML/Trello; nicht angehakte als „Name (Import)“ (je Name einmal); ohne `merge` wie bisher zusammen.
6. **Offene Punkte V138/V139:** Live-Hinweis oben im Bearbeiten-Fenster der Grafik-Blätter (`PROJECTS_TEXT.liveEditHint`); Bilder der Meldung auf dem Blatt der Problemstellung (ansehen, entfernen, hinzufügen; `storePics` und `Thumb` aus `FeedbackCard.tsx` exportiert, Board-Fenster nutzt dieselbe Funktion). „Gerechnete Dauer blass“ war schon gebaut (Platzhalter + Hinweis im PSP).
7. Handbuch 7, 7.1, 7.3, 9 (+ Stand V148, Änderungsverzeichnis); Lastenheft F-232/F-234 „Gebaut V148“, F-230 F7; `APP_VERSION = 'V148'`; Live-Projekt V148 (206 F-Punkte, 3 ersetzt, 129 fertig, 26 teilweise, 48 offen). Tests +4 (783).

## Prüfliste für Enrico (zusätzlich zu V77–V147)

- Projekt › Formulare › **8.3 Arbeitspaketbeschreibung** (CG-1.6.4): Reihenfolge wie Abb. 11; rote Werte (Teilaufgabe, Projektleiter, Dauer, Vorgänger, Nachfolger, Personal) sind gerechnet; **Sachmittel** und **Anlagen** eintragen – Meldung am Feld.
- **Bericht** › PDF: 8.3 als Blatt mit QR-Code auf einer Seite, Freigabe „Unterschrift PL“ links, „Unterschrift AP-V“ rechts; 12/12.1 nur das Blatt (keine Liste darunter); 14 mit Zeile „Abnahme“.
- **Importieren** einer CSV mit Namen, die es schon gibt → Rückfrage; Haken weg → „Name (Import)“ entsteht.
- Projekt › Meldungen › Darstellung **Blatt**: unten „Bilder“ – Bild hinzufügen, antippen, entfernen.
- Live-Projekt (Online-Demo): Kasten in einer Grafik anklicken → oben im Fenster „Live-Projekt – nur zum Ansehen. Änderungen in diesem Fenster werden nicht gespeichert.“

## Kleine Punkte (neu in V148)

- 13.1 Teamrollen und 14.1 Nachrichtenquadrat: im Bericht steht unter dem Blatt noch die Feldliste – prüfen, ob das Blatt alles zeigt (wie 12/12.1).
- AP-Statusbericht im Bericht ohne „Unterschrift AP-V“ (wie Abb. 15, nur PL); die Tinte `inkOwner` am AP-Statusbericht wird im Bericht nicht mehr gezeigt.
- Problemstellung: Vermerke/Spur noch nicht auf dem Blatt; Feedback-/Entscheidungsblätter nicht im Projektbericht (Enrico fragen).
- `Projects/Claude outputs/v148` (und `v147`, `tmp142`, `v146`) löschen – Freigabe nötig.
- Unverändert offen: Umwandeln über Apple-Texterkennung/Dienst (NF-01), Tinte gerätegebunden, Fußzeile in Browsern ohne Seitenrand-Felder, F-211 (Rechte/Server), F-234 ●/◐ im Lastenheft angleichen (Enrico entscheidet).

### Ältere offene Punkte

V141: Regel-Auslöser „Notiz kommt in den Eingang“ und Tour um den Eingang (hängt an K14); Entwürfe zählen im Eingang erst nach dem Speichern. V140/V139: eigene Reihenfolge im Eisenhower-Feld (mit Enrico klären); Entscheidungsvorlage: Kriterien/Lösungen anlegen nur im Werkzeug. Sonst unverändert in `V147_…` bis `V131_…`.

## Commit-Text V148 (e-sources)

**Summary:** `V148: Arbeitspaketbeschreibung wie Abb. 11 (Blatt und Bericht), Statusberichte ohne doppelte Liste, CSV fragt bei gleichen Personen nach`

**Description:**
```
- 8.3 Arbeitspaketbeschreibung am Bildschirm und im Bericht/PDF in der Anordnung von Abb. 11 (wpSheet.ts: Teilaufgabe, Projektleiter, Dauer, Vorgänger/Nachfolger aus dem Netzplan, Personal aus den Einsätzen)
- Neue Felder Sachmittel und Anlagen; Feldliste in Report-Reihenfolge und -Bezeichnungen; Beispiel CG-1.6.4 wie Abb. 11
- Bericht: 12/12.1 ohne zweite Feldliste unter dem Blatt; 14 Projektabschluss mit Zeile Abnahme; „Datum“ als Platzhalter in Freigaben
- CSV-Import fragt bei gleichnamigen Personen nach (wie XML/Trello), sonst „Name (Import)“
- Bilder der Meldung auf dem Blatt der Problemstellung; Live-Hinweis im Bearbeiten-Fenster
- Tests 783 (+4); Handbuch V148, Lastenheft F-232/F-234/F-230, APP_VERSION V148, Live-Projekt V148, Übergabe V148

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q7g5Qdfv5ABSwvszYz
```
