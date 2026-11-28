# Übergabe V146 → V147 E-Sources

Stand: 28.11.2026 · Chat V146 · Nächster Chat: **V147 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V147 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft den **Nachtrag V142 zu F-232/F-234** („Gebaut V146 (P10)“), **F-211** (Vorstufe V146), **F-236**, **F-232** (P11–P14), **F-231 K14** und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64`, Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, Rev. 17). Stand V146: alle drei unbeantwortet, keine Kommentare. Beantwortet → Doc anpassen („io“), PDF erneuern, Lastenheft nachziehen, bauen (F-236 B schließt P11 ein). **Sonst erstes Paket V147 (kleine Punkte, Funktion vor Design):** Formular **Projektauftrag** (Kapitel 2.x/Steckbrief-Felder im Formular) mit dem Report abgleichen, danach offene Punkte aus V141/V140. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, Retro-Designs: Bedienelemente im Stil des Systems, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V146_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste jetzt `… schedule watch inbox tableFiles ink qr`. Tests V146: **777** grün (`workspace` 527, `gpm` 73, `qr` 7). `npx tsc --noEmit -p .` sauber (`timeout 170`, `timeout_ms: 180000`; Tests und tsc in getrennten Aufrufen). **Hinweis Testersatz:** `not.toMatch`/`not.toContain` meiden – stattdessen `expect(s.includes(…)).toBe(false)`.

**QR-Codes prüfen (neu V146):** Im VM von Enrico gibt es OpenCV (`python3 -c "import cv2"`). `cv2.QRCodeDetectorAruco()` liest zuverlässig; der normale `cv2.QRCodeDetector()` scheitert an manchen gültigen Masken – nicht für Prüfungen nehmen. Grafik als Bild: SVG per node aus `$HOME/vt2/out` nach `Projects/Claude outputs/` schreiben, stagen, im Container `rsvg-convert`, dann Aruco auf das PNG.

**Browser:** `http://localhost:2910/` (Enrico startet `npm run dev`). **Neu:** Ein Kapitel direkt öffnen per Adresse `http://localhost:2910/?projekt=pj-cg&blatt=<Formular-Id>&zeile=<Eintrag-Id>` (z. B. `blatt=charter`, `blatt=wp&zeile=cg-31`) – spart das Drehen am Kapitel-Rad. Enricos lokales ColorGentlemen ist ein älterer Stand (ohne Hauptziele/Beteiligte und ohne 8.3-Beschreibung); das Beispiel im Code ist aktuell.

## Was in V146 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 (P11–P14) unbeantwortet (Rev. 6/6/17), keine Kommentare.
2. **QR-Code wie im Report** (F-232 P10, Vorstufe F-211): eigener Erzeuger `workspace/qr.ts` (keine Bibliothek, Installationen sind gesperrt) – Byte-Modus, Fehlerkorrektur M, Version 1–40, Maskenwahl nach Regeln 1–4; mit OpenCV gegengelesen (Version 1–21, Umlaute, alle Masken). `qrMatrix`, `qrPath`, `qrSvg` (eigenständig, mit `aria-label`/`title`), `qrInner` (eingebettet).
3. **Verweis** `workspace/projectLink.ts`: `?projekt=…&blatt=…&zeile=…` (nur Kennungen), `projectLinkUrl`, `parseProjectLink`, `withoutProjectLink`, `appBase` (leer außerhalb von http(s)), `holdProjectLink`/`takeProjectLink`. App liest die Adresse beim Start, bereinigt sie und schickt `STEER_EVENT`; `ProjectCockpit` wählt Projekt, Ansicht „Formulare“ und gibt `jump` an `ProjectForms` (Kapitel + Eintrag). Meldung am Ort „Verweis geöffnet: … › Formulare.“ bzw. „Projekt gibt es auf diesem Gerät nicht“. Im Browser geprüft (8.3 mit CG-1.6.4, 2.1).
4. **Wo der QR-Code steht (wie Report S. 19/24):** 8.3 Arbeitspaketbeschreibung oben links (Blatt: `td.pjf__sheetqr`; Bericht: `table.sheethead` mit Link), 12.1 AP-Statusbericht und 12 Statusbericht oben rechts im Kopf (`reportKit.head(title, kw, qr)`; Titel rückt in die Mitte der Restbreite und wird bei Bedarf kleiner). AP-Statusbericht verweist auf die 8.3 des Arbeitspakets (wie im Report auf die Arbeitskarte), Statusbericht auf seinen Eintrag in 12.
5. **Fußzeile im Druck** wie im Report dreiteilig: links „Projektbericht <Nr.> · Stand …“, Mitte „Version …“ (`docVersion`: 6.4 Dokumentation, Eintrag „Projektbericht“/„Report“, sonst E-Sources-Version), rechts „Seite x von y“. Bildschirm ohne Fußzeile.
6. **Abgleich mit dem Report:** Beispiel CG-1.6.4 mit Arbeitspaketbeschreibung wie Abb. 11 (Ziel, Aktivitäten, Voraussetzungen/Sachmittel, Chancen, Ergebnis, aufwandsproportional, Freigaben). Steckbrief (Abb. 3) im Code geprüft – stimmt seit V132.
7. Handbuch 7.1 (+ Stand V146) und Änderungsverzeichnis; Lastenheft Nachtrag V142 („Gebaut V146 (P10)“), F-211 ◐ Vorstufe; `APP_VERSION = 'V146'`; Live-Projekt V146 (206 F-Punkte, 3 ersetzt, 129 fertig, 26 teilweise, 48 offen). Tests +7 (777).

## Prüfliste für Enrico (zusätzlich zu V77–V145)

- ⚙ bzw. Projektliste › Beispielprojekt **ColorGentlemen entfernen und neu anlegen** (dein Stand ist älter) → Formulare › **8.3 Arbeitspaketbeschreibung** › CG-1.6.4: oben links QR-Code, Felder wie Abb. 11.
- QR-Code mit dem **iPhone** scannen (Kamera) → öffnet E-Sources: Projekt-Modus › Formulare › 8.3 › CG-1.6.4, Meldung „Verweis geöffnet“. Hinweis: Am Mac läuft E-Sources unter `localhost` – der Code im lokalen Stand führt deshalb nur am Mac selbst zum Ziel; in der Online-Demo zeigt er auf die Demo-Adresse.
- **12.1 AP-Statusbericht** und **12 Statusbericht**: QR-Code rechts oben im Kopf, Titel daneben vollständig.
- **Bericht** › drucken/PDF (Chrome): unten links „Projektbericht CG-1 · Stand …“, Mitte „Version …“, rechts „Seite x von y“; 8.3 mit QR-Kopf, QR im PDF anklickbar. In Safari prüfen, ob die Fußzeile erscheint.
- 6.4 Dokumentation: Eintrag „Projektbericht“ mit Version 2 → Bericht zeigt „Version 2“.

## Kleine Punkte (neu in V146)

- Fußzeile über `@page`-Randfelder – Browser ohne diese Felder drucken sie nicht (dann Chrome).
- QR-Code nur an 8.3, 12, 12.1 (wie im Report). F-211 (alle PDFs, Rechte, Server) bleibt offen.
- Der Verweis öffnet das Formular, nicht die Notiz im Pad – bei Bedarf später „Notiz öffnen“ als Ziel.
- Unverändert offen: Umwandeln über Apple-Texterkennung/Dienst (NF-01), Tinte gerätegebunden, `tmp142` und `v146` in `Claude outputs` löschen (Freigabe nötig).

### Ältere offene Punkte

Unverändert in `V145_Uebergabe_E-Sources.md`, `V144_…` bis `V131_…`.

## Commit-Text V146 (e-sources)

**Summary:** `V146: QR-Code wie im Report an 8.3/12/12.1 mit Verweis ins Projekt, Fußzeile mit Version, Beispiel CG-1.6.4 wie Abb. 11`

**Description:**
```
- Eigener QR-Erzeuger (qr.ts): Byte-Modus, Fehlerkorrektur M, Version 1–40, Maskenwahl; mit OpenCV gegengelesen
- Verweis ?projekt=…&blatt=…&zeile=… (projectLink.ts): öffnet Projekt-Modus › Formulare › Kapitel und Eintrag, Meldung am Ort
- QR-Code an 8.3 Arbeitspaketbeschreibung (oben links) sowie 12 und 12.1 (oben rechts im Kopf) – Blatt und Bericht, im PDF als Link
- Fußzeile im Druck wie im Report: Projektbericht · Stand | Version (aus 6.4 Dokumentation) | Seite x von y
- Beispielprojekt: Arbeitspaketbeschreibung CG-1.6.4 wie Abb. 11
- Tests 777 (+7); Handbuch 7.1, Lastenheft Nachtrag V142 und F-211, APP_VERSION V146, Live-Projekt V146, Übergabe V146

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q45uWNbgNm7x2nNyJ6
```
