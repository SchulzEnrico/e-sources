# Übergabe V145 → V146 E-Sources

Stand: 28.11.2026 · Chat V145 · Nächster Chat: **V146 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V146 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-238** („Gebaut V145“), den **Nachtrag V142 zu F-232/F-234** („Gebaut V145“), **F-236**, **F-232** (P11–P14), **F-231 K14** und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64`, Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, Rev. 17). Stand V145: alle drei unbeantwortet, keine Kommentare. Beantwortet → Doc anpassen („io“), PDF erneuern, Lastenheft nachziehen, bauen (F-236 B schließt P11 ein). **Sonst erstes Paket V146 (kleine Punkte, Funktion vor Design):** Report-Fußzeile der Blätter (P10: „Version · Seite“ nur im Druck/PDF, QR-Code wie im Report als Verweis auf das Projekt), danach Steckbrief/Projektauftrag mit dem Report abgleichen (seit V132 unverändert), dann offene Punkte aus V141/V140. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, Retro-Designs: Bedienelemente im Stil des Systems, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V145_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink`. Tests V145: **770** grün (`workspace` 527, `gpm` 73, `ink` 10). `npx tsc --noEmit -p .` sauber (`timeout 170`, `timeout_ms: 180000`; nicht im Hintergrund). **Hinweis Testersatz:** `not.toMatch` meldet falsch – stattdessen `expect(/…/.test(s)).toBe(false)`. In Tests lassen sich Module mit `await import('./gpmFigures')` laden.

**Browser:** wie V142–V144. Kapitel-Rad: nach dem Anlegen von ColorGentlemen steht es auf 8.3 (22 von 41); 9 Balkenplan = 23, 6.1 Organigramm = 12 (`ArrowUp`/`ArrowDown`, auf `aria-valuetext` warten). Schreibfläche: `Alt+w` auf `body`, `dialog.inkdlg`, Knopf `.inkdlg__more`. Module lassen sich im Browser per `page.evaluate(() => import('/src/workspace/fileOut.ts'))` direkt prüfen.

## Was in V145 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 (P11–P14) unbeantwortet, keine Kommentare.
2. **Tinte als Bild sichern/teilen** (F-238): Knopf „Als Bild sichern“ (Pfeil nach unten) an der Handschrift in der Notiz – PNG über `svgToPng` (weißer Grund, doppelte Auflösung, sonst SVG), Name `inkFileName` („Handschrift 2026-11-28 08-15.png“). Gemeinsamer Helfer `shareOrDownload` in `workspace/fileOut.ts` (Teilen-Menü auf Touch, sonst Download) – Ton (`AudioChips`) und Bild (`PicView`) nutzen ihn jetzt auch (vorher dreifach kopiert).
3. **Schreibfläche „Mehr Platz“:** Knopf unten links im Fenster verlängert die Seite um 400 (bis 5 Flächen, `growInk`/`canGrowInk`/`INK_MAX_H`), Anzeige „2/5“, Ansage; Striche bleiben; nicht bei Unterschriften. Im Browser geprüft (400 → 800, Strich bleibt).
4. **Balkenplan wie MS Project:** Zeitskala Quartal mit Jahr · Monat · KW (`ganttTiers`, `tierHeads`), KW nur ab 16 pt je Woche; Beschriftung nur, wenn sie ins Feld passt (sonst Tooltip). Im Browser geprüft.
5. **Phasenplan:** Kürzel und Daten naher Meilensteine stapeln sich (`labelLevels`), vorher höchstens zwei Ebenen bzw. Überdeckung.
6. **Organigramm:** Kasten „Abkürzungen“ unter der Legende (`orgAbbrevs`, `ORG_ABBR`), nur vorkommende Kürzel, eigene Erklärung „Projektbüro (PA)“ vor der Liste. Im Browser geprüft (PA, QMB, TL).
7. **Freigabe mit Namen der Projektleitung** aus der Rolle „lead“ (`leadName`) in 8.3, 12, 12.1 – Blatt und Bericht lesen beide `reportSigns`; im AP-Statusbericht auch der AP-Verantwortliche.
8. **Eigene Vorlagen** (Kopie von GPM_D vor V144) erben beim Laden die Figur der Standardvorlage (`parseFormTemplates`) – Statusbericht als Blatt auch dort.
9. Handbuch 5 und 7.1, Änderungsverzeichnis V145; Lastenheft F-238 und Nachtrag V142; `APP_VERSION = 'V145'`; Live-Projekt V145 (206 F-Punkte, 3 ersetzt, 129 fertig, 25 teilweise, 49 offen). Tests +11 (770).

## Prüfliste für Enrico (zusätzlich zu V77–V144)

- Pad › Notiz mit Handschrift › Pfeil nach unten **„Als Bild sichern“** → am Mac Download „Handschrift … .png“, auf iPhone/iPad Teilen-Menü (Fotos sichern, Nachrichten …).
- **Alt/⌥+W** › unten links **„Mehr Platz“** → Seite wird länger, „2/5“; nach fünf Flächen Hinweis „Länger geht die Seite nicht“. Fertig → Handschrift im Eingang, Vorschau in voller Länge.
- Ton „Als Datei sichern“ und Bild „Als Datei sichern“ funktionieren wie vorher (gemeinsamer Helfer).
- Formulare › **9 Balkenplan** → oben Q4 2026 / Q1 2027 …, darunter Monate und KW.
- Formulare › **7 Phasenplan** → nahe Meilensteine (Kürzel, rote Daten) überdecken sich nicht.
- Formulare › **6.1 Organigramm** → rechts unter der Legende **Abkürzungen** (PA, QMB, TL).
- **8.3 / 12 / 12.1** › Freigabe: unter „Unterschrift Projektleitung“ steht der Name; Bericht öffnen → ebenso.

## Kleine Punkte (neu in V145)

- „Als Bild sichern“ gibt es nur an der Notiz, nicht an Unterschriften (dort reicht der Bericht/PDF).
- Balkenplan im Bericht/PDF: KW-Zeile bei langen Projekten fällt weg (zu eng) – wie MS Project mit Zoom „Monate“.
- Die Liste der gängigen Abkürzungen (`ORG_ABBR`) ist klein; neue Kürzel erklärt man am einfachsten im Rollennamen „Name (ABK)“.
- Unverändert offen: Umwandeln über Apple-Texterkennung/Dienst (NF-01), Tinte gerätegebunden, `tmp142` in `Claude outputs` löschen (Freigabe nötig).

### Ältere offene Punkte

Unverändert in `V144_Uebergabe_E-Sources.md`, `V143_…` bis `V131_…`.

## Commit-Text V145 (e-sources)

**Summary:** `V145: Tinte als Bild sichern, Schreibfläche verlängern, Balkenplan mit Quartal/Monat/KW, Abkürzungen im Organigramm, PL-Name in den Freigaben`

**Description:**
```
- Handschrift „Als Bild sichern“ (PNG über svgToPng, sonst SVG; Teilen-Menü auf Touch, sonst Download); gemeinsamer Helfer shareOrDownload für Ton, Bild und Tinte (fileOut.ts)
- Schreibfläche „Mehr Platz“: Seite um eine Fläche verlängern, höchstens fünf, Anzeige 2/5
- Balkenplan: Zeitskala Quartal mit Jahr · Monat · KW wie MS Project (ganttTiers)
- Phasenplan: Kürzel und Daten naher Meilensteine gestapelt (labelLevels)
- Organigramm: Abkürzungen unter der Legende (orgAbbrevs)
- Freigaben in 8.3, 12 und 12.1 mit Namen der Projektleitung (leadName) – Blatt und Bericht gleich
- Ältere eigene Vorlagen erben die Figur der Standardvorlage (Statusbericht als Blatt)
- Tests 770 (+11); Handbuch 5/7.1, Lastenheft F-238 und Nachtrag V142, APP_VERSION V145, Live-Projekt V145, Übergabe V145

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q6bDg8ZHtcStTnafnT
```
