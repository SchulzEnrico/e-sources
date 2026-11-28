# Übergabe V144 → V145 E-Sources

Stand: 28.11.2026 · Chat V144 · Nächster Chat: **V145 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V145 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-238** („Gebaut V143“, **„Gebaut V144 (abgerundet)“**), den **Nachtrag V142 zu F-232/F-234** (jetzt mit „Gebaut V144“ = Statusbericht als Blatt), **F-236**, **F-232** (P11–P14), **F-231 K14** und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64`, Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6, gebaut nach Vorschlag A), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, Rev. 17). Stand V144: alle drei unbeantwortet, keine Kommentare. Beantwortet → Doc anpassen („io“), PDF erneuern, Lastenheft nachziehen, bauen (F-236 B schließt P11 ein). **Sonst erstes Paket V145 (kleine Punkte, Funktion vor Design):** Tinte als Bild sichern/teilen wie „Als Datei sichern“ beim Ton (`inkSvg` liefert das SVG), Schreibfläche „mehr Platz“ (Seite verlängern), danach QR-Code bzw. Report-Fußzeilen der Blätter und offene Punkte aus V142. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, Retro-Designs: Bedienelemente im Stil des Systems, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V144_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink`. Tests V144: **759** grün (`workspace` 527, `gpm` 65, `ink` 7). `npx tsc --noEmit -p .` sauber (`timeout 170`, `timeout_ms: 180000`; **nicht im Hintergrund** – Hintergrundprozesse enden mit dem Aufruf).

**Browser:** wie V142/V143. Beispielprojekt: Knopf „Beispielprojekt „ColorGentlemen“ anlegen“ → Ansicht steht auf Formulare. Kapitel-Rad: `getByRole('slider', { name: 'Kapitel' })` fokussieren, `ArrowDown`/`ArrowUp` je Raste, auf `aria-valuetext` warten (12 Statusbericht = 31 von 41, 8.3 = 22). Statusbericht anlegen: Knopf „+ Zeile“. Unterschreiben: `.paper__release .paper__signbtn`, dann Striche per `PointerEvent` auf `.ink__canvas`, `.inkdlg__save`. Blatt: `svg[aria-label^="Statusbericht"]`, Tinte darin als `<image>`.

## Was in V144 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 (P11–P14) unbeantwortet, keine Kommentare.
2. **F-238 abgerundet:**
   - Unterschreiben auch in **8.3 Arbeitspaketbeschreibung** (Freigabe-Zeile im Blatt: AP-Verantwortlich mit Namen aus dem Arbeitspaket, Projektleitung, je mit Datum), **12 Statusbericht** (nur PL) und **12.1 AP-Statusbericht** (AP-Verantwortlich und PL). Daten: `NoteWp.inkOwner/inkPl`, `WpReport.inkOwner/inkPl`, `StatusReport.inkPl` (+ `place`). Formular-Operation `ink` → `Fk.setSignInk` (kein Formularfeld, `setCell` kennt nur Spalten).
   - `InkSign` und `openInk({ sign: { label, ref, save } })` allgemein (vorher Projekt/Feld nur Steckbrief); Steckbrief nutzt `save` mit `charterEdit`.
   - `inkRefs` zählt alle Unterschriften (Aufräumen beim Start).
   - **Bericht/PDF:** `reportSigns`, `reportInkRefs`, `signRowHtml` in `gpmReport.ts` – Freigabe-Zeile mit Tinte als SVG-Bild, sonst Name in Schreibschrift, darunter Datum und Rolle; Freigabe-Daten nicht mehr doppelt. `ProjectForms` lädt die Tinten vorab (Zustand `inks`, neu bei `esource:inkstore`), damit `openReport` synchron bleibt (Pop-up-Blocker).
   - Handschrift an einer offenen Notiz: Meldung mit **„Als neue Notiz lösen“** (nur, solange die Notiz unverändert ist).
3. **Statusbericht (12) als Blatt** im Aussehen von Abb. 15: `statusReportSvg` (Figur `statusReport`, Formular `reports` hat jetzt `figure`), gemeinsame Bausteine `reportKit` mit dem AP-Statusbericht (Kopf, Paare, Ampel + Kreis, Blöcke, lange Felder, Fuß mit Ort/Datum/Unterschrift PL – mit Tinte). Neues Feld **Ort**. `kwOf` über den Jahreswechsel mit Jahr („49. KW 2026 – 20. KW 2027“), sonst „18./19. KW“ bzw. „10.–20. KW“. Kreisbeschriftung kleiner Anteile (< 25 %) außen, dunkel (Texte nie über Feldränder). Doppel-Leerzeichen „Hamburg,  17.05.“ behoben.
4. Handbuch 5 (Handschrift lösen), 7.1 (Unterschreiben, Statusbericht als Blatt, AP-Statusbericht) und Änderungsverzeichnis V144; Lastenheft F-238 und Nachtrag V142; `APP_VERSION = 'V144'`; Live-Projekt V144 (206 F-Punkte, 3 ersetzt, 129 fertig, 25 teilweise, 49 offen).
5. Im Browser geprüft: Statusbericht anlegen → Blatt, Unterschreiben → Tinte unter dem Formular und im Blatt über „Unterschrift PL“, Meldung mit Rückgängig; 8.3 Freigabe-Zeile mit zwei „Unterschreiben“ und Datum.

## Prüfliste für Enrico (zusätzlich zu V77–V143)

- Formulare › **12 Statusbericht** › „+ Zeile“ → Blatt wie der AP-Statusbericht (Ampel, Kreis Leistung, Termin/Kosten, Aufwand, Kosten, Texte, Ort, Unterschrift PL); Felder darunter, **Ort** eintragen → erscheint unten links.
- Statusbericht › Freigabe › **„Unterschreiben“** → Tinte unter den Feldern und im Blatt; Papierkorb entfernt mit Rückgängig.
- **8.3 Arbeitspaketbeschreibung** › Freigabe: „Unterschreiben“ für AP-Verantwortlich und Projektleitung, Datum darunter.
- **12.1 AP-Statusbericht** › Freigabe: zwei Unterschriften; die der PL steht im Blatt über „Unterschrift PL“.
- **Bericht** öffnen → im Steckbrief, in 8.3, 12 und 12.1 steht die Freigabe mit Tinte bzw. Name in Schreibschrift.
- Pad mit offener Notiz › „Bild, Stift & Teilen“ › „Mit der Hand schreiben“ › Fertig → Meldung mit **„Als neue Notiz lösen“** → Handschrift liegt danach als eigene Notiz im Eingang.

## Kleine Punkte (neu in V144)

- Eigene, gespeicherte Formular-Vorlagen (Kopie von GPM_D) haben im Statusbericht noch keine Figur `statusReport` – nur die Standardvorlage zeigt das Blatt.
- Tinte ist gerätegebunden: Im Bericht eines anderen Geräts steht der Name statt der Tinte (wie Ton).
- Freigabe-Zeile: Projektleitung ohne Namen (Rolle „lead“ könnte den Namen liefern).
- Unverändert offen: Tinte als Bild sichern/teilen, Schreibfläche verlängern, Umwandeln über Apple-Texterkennung/Dienst (NF-01), `tmp142` in `Claude outputs` löschen (Freigabe nötig).

### Ältere offene Punkte

Unverändert in `V143_Uebergabe_E-Sources.md`, `V142_…` bis `V131_…`.

## Commit-Text V144 (e-sources)

**Summary:** `V144: Unterschriften in 8.3, 12 und 12.1 mit Tinte im Bericht, Handschrift als neue Notiz lösen, Statusbericht (12) als Blatt wie Abb. 15`

**Description:**
```
- Unterschreiben auch in 8.3 Arbeitspaketbeschreibung (AP-Verantwortlich und PL mit Datum), 12 Statusbericht und 12.1 AP-Statusbericht; Meldung am Formular mit Rückgängig
- InkSign/openInk allgemein (label, ref, save); Formular-Operation ink → setSignInk; inkRefs zählt alle Unterschriften
- Bericht/PDF: Freigabe-Zeile mit Tinte, sonst Name in Schreibschrift, Datum und Rolle; Tinten vorab geladen
- Handschrift an der offenen Notiz: „Als neue Notiz lösen“ wie bei Sprachnotizen
- Statusbericht (12) als Blatt im Aussehen von Abb. 15 (reportKit gemeinsam mit dem AP-Statusbericht), Feld Ort, Unterschrift PL im Blatt
- Kalenderwochen über den Jahreswechsel mit Jahr; Kreisbeschriftung kleiner Anteile außen
- Tests 759 (+3); Handbuch 5/7.1, Lastenheft F-238 und Nachtrag V142, APP_VERSION V144, Live-Projekt V144, Übergabe V144

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q5tsFYgKEbxd7rERnC
```
