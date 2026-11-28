# Übergabe V147 → V148 E-Sources

Stand: 28.11.2026 · Chat V147 · Nächster Chat: **V148 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V148 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft den **Nachtrag V142 zu F-232/F-234** („Gebaut V147 (Abgleich Projektauftrag)“), **F-237** (Nachtrag V147), **F-236**, **F-232** (P11–P14), **F-231 K14** und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64`, Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, Rev. 17). Stand V147: alle drei unbeantwortet, keine Kommentare. Beantwortet → Doc anpassen („io“), PDF erneuern, Lastenheft nachziehen, bauen (F-236 B schließt P11 ein). **Sonst erstes Paket V148 (kleine Punkte, Funktion vor Design):** übrige Formulare mit Feldlisten (14 Projektabschluss, 8.3/12/12.1 Feldteile) im Bericht mit dem Report abgleichen wie 2.1 in V147; dann CSV-Import gleichnamige Personen (Rückfrage wie bei XML, V141), danach offene Punkte aus V139/V138. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, Retro-Designs: Bedienelemente im Stil des Systems, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V147_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink qr`. **Neu V147: Der Testersatz `vitest-ersatz.js` wartet jetzt `async`-Tests ab** – vorher zählten die 43 Tests mit `await import(…)` immer grün, egal was sie prüften (Gegenprobe gemacht: rot wird jetzt rot). Alle bestehen. Tests V147: **779** grün (`workspace` 527, `gpm` 75, `qr` 7). `npx tsc --noEmit -p .` sauber (`timeout 170`, `timeout_ms: 180000`; Tests und tsc in getrennten Aufrufen). Hinweis Testersatz: `not.toMatch`/`not.toContain` meiden – stattdessen `expect(s.includes(…)).toBe(false)`.

**Bericht als Bild prüfen (neu V147):** Der Bericht öffnet im Browser-Bereich als Datei (wird nicht angezeigt). Stattdessen per node aus `$HOME/vt2/out` (`reportHtml` mit `Sp.addSampleProject`) einen Ausschnitt nach `Projects/Claude outputs/v147/` schreiben, stagen, im Container `google-chrome --headless --no-sandbox --print-to-pdf=… --no-pdf-header-footer file://…` und `pdftoppm -r 70 -png`. Zeigt auch die `@page`-Fußzeile.

**QR-Codes prüfen:** wie V146 (OpenCV `cv2.QRCodeDetectorAruco()` im VM).

**Browser:** `http://localhost:2910/` (Enrico startet `npm run dev`). Kapitel direkt: `?projekt=pj-cg&blatt=<Formular-Id>&zeile=<Eintrag-Id>`. Enricos lokales ColorGentlemen ist ein älterer Stand; das Beispiel im Code ist aktuell.

## Was in V147 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 (P11–P14) unbeantwortet (Rev. 6/6/17), keine Kommentare.
2. **Projektauftrag mit dem Report abgeglichen:** Der Report hat keinen eigenen „Projektauftrag“ – das ist der Steckbrief (2.1, Abb. 3). Blatt am Bildschirm stimmte seit V132; der **Bericht/PDF** druckte 2.1 aber noch als alte Feldliste (Projektname, Ausgangssituation, Tailoring …, ohne Oberziel, Projektleiter/in, fixierte Meilensteine, Gesamtdauer, Projektbeteiligte, Risiken). Jetzt `charterHtml` in `gpmReport.ts`: Anordnung wie Abb. 3 mit Blöcken Termine, Kapazitätsaufwand, Kosten € (Summe + Budget-Abgleich), Risikorücklage € (% vom Budget), Projektbeteiligte, Freigabe; eigene Felder vor der Freigabe; „Ergänzungen nach ICB4“ als Abschnitt darunter (nur ausgefüllte). Druckbild per Chrome-PDF geprüft (2 Seiten, passt).
3. **Gemeinsame Werte** in neuem `workspace/charterSheet.ts` (`charterView`, `monthsBetween`, `CHARTER_EXTRAS`) – Blatt und Bericht rechnen gleich. Projektleiter/in: Rolle „Projektleitung“, sonst Name aus Freigabe PL, sonst ich.
4. **`FIELDS.charter`** in Report-Reihenfolge und -Bezeichnungen (Projekttitel, Oberziel, Hauptziele/ Kurzbeschreibung Projektinhalt, Starttermin, Budget insgesamt, PM-Kosten, Projektbeteiligte: Fachteam …), danach die ICB4-Ergänzungen.
5. **Funktionslücke behoben:** Messgröße des Nutzens, Business Case, Vorgehensmodell, Tailoring, Komplexität, Erfolgskriterien waren seit V132 nirgends bearbeitbar. Jetzt zuklappbarer Kasten **„Ergänzungen nach ICB4 (4.3.1 · 4.5.1)“** unter dem Blatt (`CharterExtras` in `ProjectSheet.tsx`, Blattbreite mit Zoom, Meldung am Feld, Zähler „x von 6 ausgefüllt“). Im Browser geprüft.
6. **Offene Punkte V140/V141:** Matrix im Pad zeigt „Für … · Einschätzung vom …“ (`MATRIX_TEXT.who`); von Hand angelegte Projekte bekommen `eisenInit` beim Anlegen (keine überraschende Matrix beim nächsten Laden; Importe und Beispiele weiter wie bisher); „Live-Projekt verliert `eisenMaps`“ nicht nachvollziehbar (bleibt dank `...old`) – mit Test abgesichert. Aufgeräumt: ungenutzte `envSvg`/`shSvg` (gpmReport), `MATRIX_TEXT.exists`. (`UI_COLORS` in ProjectForms wird noch gebraucht.)
7. **Testersatz** `async`-fähig (siehe oben).
8. Handbuch 7/7.1 (+ Stand V147, Änderungsverzeichnis); Lastenheft Nachtrag V142 („Gebaut V147“), F-237 Nachtrag V147; `APP_VERSION = 'V147'`; Live-Projekt V147 (206 F-Punkte, 3 ersetzt, 129 fertig, 26 teilweise, 48 offen). Tests +2 (779).

## Prüfliste für Enrico (zusätzlich zu V77–V146)

- Projekt › Steckbrief: unter dem Blatt **„Ergänzungen nach ICB4“** aufklappen – Felder ausfüllen, Meldung erscheint am Feld, Zähler steigt.
- **Bericht** › drucken/PDF: Kapitel 2.1 sieht aus wie Abb. 3 (Termine-Block mit fixierten Meilensteinen und Gesamtdauer, Kosten mit Summe, „x % vom Budget“, Projektbeteiligte); darunter „Ergänzungen nach ICB4“.
- Pad mit Eisenhower-Matrix, der in 15.2 Person/Datum gegeben wurden: Zeile „Für … · Einschätzung vom …“ über der Matrix.
- Neues Projekt anlegen, Arbeitspakete anlegen, neu laden → keine Matrix von selbst (mit „+ Matrix“ selbst anlegen).

## Kleine Punkte (neu in V147)

- Feldlisten der anderen Formulare (14 Projektabschluss, Feldteile von 8.3/12/12.1) im Bericht noch als einfache Liste – wie 2.1 mit dem Report abgleichen.
- Freigabe-Zeile im Bericht: Beschriftung „Unterschrift Auftraggeber/Projektleitung“, im Report „Datum, Unterschrift AG/PL“ – bei Bedarf angleichen.
- `Projects/Claude outputs/v147` (und `tmp142`, `v146`) löschen – Freigabe nötig.
- Unverändert offen: Umwandeln über Apple-Texterkennung/Dienst (NF-01), Tinte gerätegebunden, Fußzeile in Browsern ohne Seitenrand-Felder, F-211 (Rechte/Server).

### Ältere offene Punkte

V141: CSV-Import gleichnamige Personen; Regel-Auslöser „Notiz kommt in den Eingang“ und Tour um den Eingang (hängt an K14); Entwürfe zählen im Eingang erst nach dem Speichern. V140: „Arbeitspakete übernehmen“ Reihenfolge im Feld. Sonst unverändert in `V146_…` bis `V131_…`.

## Commit-Text V147 (e-sources)

**Summary:** `V147: Projektsteckbrief im Bericht wie Abb. 3, ICB4-Ergänzungen wieder bearbeitbar, Testersatz wartet async-Tests ab`

**Description:**
```
- Bericht/PDF: Kapitel 2.1 in der Anordnung von Abb. 3 (Termine, Kapazität, Kosten mit Summe, Rücklage %, Projektbeteiligte, Freigabe), ICB4-Ergänzungen als Abschnitt darunter
- charterSheet.ts: gemeinsame Werte für Blatt und Bericht (Projektleiter/in, fixierte Meilensteine, Gesamtdauer, Kosten, Risiken)
- Feldliste des Projektsteckbriefs in Report-Reihenfolge und -Bezeichnungen
- Ergänzungen nach ICB4 (Nutzen-Messgröße, Business Case, Vorgehensmodell, Tailoring, Komplexität, Erfolgskriterien) wieder bearbeitbar unter dem Blatt
- Matrix im Pad mit Person/Datum; neue Projekte ohne automatische Matrix; ungenutzte Portfolio-Zeichner entfernt
- Testersatz wartet async-Tests ab (43 Tests prüften vorher nichts); Tests 779 (+2)
- Handbuch V147, Lastenheft F-232/F-237, APP_VERSION V147, Live-Projekt V147, Übergabe V147

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q3ZPDGZGPfrM3vKb51
```
