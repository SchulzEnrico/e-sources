# Übergabe V142 → V143 E-Sources

Stand: 28.11.2026 · Chat V142 · Nächster Chat: **V143 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V143 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-238** (neu, „Entschieden V142“), den **Nachtrag V142 zu F-232/F-234** (alle Formulare wie im Report) und den **Fehler V142** (Kartenfenster im Netzplan), dazu **F-236**, **F-232** (P11–P14), **F-231 K14** und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug: `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64`; Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6, gebaut nach Vorschlag A), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, Rev. 17), **F-238 Handschrift** https://claude.ai/artifact/CpVv2PKmHN67bZkt3xjkZC (slug `5fb64d2c-97e8-46ca-a09f-2fbab2a166d7`, Tab `9ee46574-a48e`, Rev. 7, **entschieden**). Große Exporte (PDF) landen in einer Datei unter `/tmp/claude-tool-results/…` – mit Python `json` + `base64` lesen, nach `/mnt/user-data/outputs/` schreiben, `device_commit_files` mit `force`. **Erstes Paket V143: F-238 Handschrift bauen** (Plan unten). **Danach** F-236 bzw. F-232 P11–P14, sobald beantwortet; offene Punkte aus dem Formular-Paket (Statusbericht 12 als Blatt). **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, Retro-Designs: Bedienelemente im Stil des Systems, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V142_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste mit `… schedule watch inbox tableFiles`. Tests V142: **749** grün (`gpm` 62, `workspace` 527 – war in V141 schon 527, die Angabe 528 dort stimmte nicht). `npx tsc --noEmit -p .` sauber (mit `timeout 170`, `timeout_ms: 180000`).

**Grafiken als Bild prüfen:** Skript `$HOME/vt2/fig.js` (nach dem Kompilieren in `$HOME/vt2/out`): `require(O+'sampleProject')`, `W.defaultWorkspace()`, `Sp.addSampleProject`, `Fg.figureSvg(ws, Sp.SAMPLE_PROJECT, kind, {day})` → SVG nach `Projects/Claude outputs/tmp142/` (noch vorhanden, Löschen braucht `device_request_delete_permission`), `device_stage_files`, im Container `rsvg-convert`. Report-Seiten: `Report_ColorGentlemen_CG-1.pdf` stagen, `pdftoppm -f n -l n -r 70`; Abbildungen auf S. 3, 4, 6, 8, 10, 13, 15, 16, 18, 19, 20, 22, 24, 25, 26, 27.

**Browser:** wie V138. Neu: Rad „Ansicht“ braucht ~1 s je Raste (`aria-valuetext` prüfen), Netzplan-Kästen sind `.nw__node`, Kartenfenster über den Knopf „Notiz öffnen“ (Doppelklick öffnete im Test nichts). Der eingebaute Browser war nur ~320 px breit – Bilder sehr klein; DOM-Prüfungen per `evaluate` sind verlässlicher.

## Plan F-238 Handschrift (entschieden V142, Enrico 15:16)

„Baue es so, dass das überall funktioniert. Wir folgen deinen Vorschlägen und passen bei Bedarf an. Normale handschriftliche Notizen sollen dabei auch gespeichert werden. Ähnlich wie bei den Sprachnotizen.“ – Vorbild ist die Sprachnotiz (F-215 V77–V79, `audioStore.ts`, `AudioChips.tsx`, `useVoice.ts`, `notes.ts` `addAudio`/`audioOf`/`isVoiceNote`).

1. **Daten:** `NoteAttachment` kind `ink` (`ref`, `at`, `dev`, `w`, `h`, optional `text` = umgewandelt); `Note.origin.via = 'ink'`. Striche in IndexedDB `esource.ink` (`workspace/inkStore.ts` wie `audioStore.ts`/`imageStore.ts`): `{ tool: 'pen'|'marker'|'eraser', color, width, pts: [x, y, druck][] }`, Punkte gerundet. Abgleich nur des Verweises; fehlt die Tinte auf dem Gerät: Vorschau ausgegraut „Handschrift liegt auf ‚…‘“. Papierkorb/Rückgängig/„Als neue Notiz lösen“ nehmen die Tinte mit (wie Ton).
2. **Schreibfläche** `components/InkPad.tsx`: Canvas mit Pointer Events (`pressure`, `pointerType`): Stift schreibt, Finger scrollt, sobald ein Stift erkannt wurde (Handflächen-Schutz), Maus/Trackpad schreibt auch. Werkzeuge Stift · Marker · Radierer, drei Farben, Rückgängig/Wiederholen, Löschen mit Rückgängig am Ort. Leiste per Tastatur bedienbar, `role=img` mit Textalternative (umgewandelter Text bzw. „Handschrift, n Striche“).
3. **Überall (S2):** Halbkreis am Steuerknopf neben „Sprachnotiz“ (Platz „Handschrift“, Kürzel z. B. Alt/⌥+W prüfen, ob frei), „Notizen & Aufgaben“-Menü, Portal „Neue Notiz“, Gedankenparkplatz (Knopf ✎ im Feld), Block im Notizblock über Ereignis `esource:ink` (wie `esource:img`: an der Schreibmarke, danach Absatz). Kritzeln (Scribble) in Textfeldern braucht nichts – am iPad prüfen lassen; Gedankenparkplatz bekommt einen Knopf zum Öffnen ohne Tastatur (Knopf „Notizen & Aufgaben“ › „Gedankenparkplatz“ gibt es schon – prüfen).
4. **Speichern wie Sprachnotizen (S8):** neue Handschrift-Notiz landet im **Eingang** (K14, `inbox.ts`), Liste zeigt Stift-Symbol (gedämpft, keine eigene Farbe), Bildschirmleser „Handschrift“.
5. **Umwandeln (S3):** Knopf „In Text umwandeln“. Lokal: `navigator.createHandwritingRecognizer` (Chromium, nur wo vorhanden – Feature-Abfrage) ; sonst Feld „Text dazu“ unter der Tinte mit Fokus (dort wandelt Kritzeln auf dem iPad selbst um). Mac-App (Apple-Texterkennung) und Dienst im Netz erst später, Dienst nur nach Zustimmung (NF-01). Tinte bleibt, Text steht darunter (S4), Rad „Tinte“ zeigen · ausblenden.
6. **Unterschrift (S6):** Freigabe-Felder (Steckbrief, Arbeitspaketbeschreibung, AP-Statusbericht) bekommen „Unterschreiben“ → kleine Schreibfläche, Tinte statt Schreibschrift (F-232 P8 ergänzen).
7. Tests (`ink.test.ts`: Striche runden/serialisieren, Anhang anlegen/entfernen, Eingang), Hilfe „Handschrift“, Begriffe, Handbuch Kap. 5 + 12.

## Was in V142 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 unbeantwortet, keine Kommentare.
2. **Alle Formulare wie im Report** (Lastenheft „Nachtrag V142“): Zielhierarchie und PSP (Kopf mit Projektname groß, Ziel, Nummer; Spaltenfolge L · S · T · K · N; Legende in der freien Fläche; Kästen fett mit Glanz), Organigramm (`orgLabel`, Name groß, Firmenfarben extern, Reiter „Auftraggeber“, Projektleitung rot), Phasenplan (Jahrespfeil, Meilensteine an der Phase, Daten rot), Balkenplan (Anfang/Ende/Vorgänger, 1240 breit), Auslastung je Monat (`weeksToMonths`), AP-Statusbericht (Projektname mit Ziel, Rahmen), Arbeitspaketbeschreibung als Blatt mit vier Spalten (`WP_SHEET`, `sheetKv` in `ProjectForms.tsx`), alle Tabellen mit dunklem Kopf und schwarzem Rahmen (`App.css`).
3. **F-238 Handschrift** (Enrico 15:15/15:16): Doc angelegt, entschieden (Option B, S2 „überall“, S8 „speichern wie Sprachnotizen“), PDF `docs/Arbeitspakete/F-238_V142_Handschrift_Pencil.pdf`, Lastenheft F-238. **Noch nicht gebaut** – erstes Paket V143.
4. **Fehler Netzplan-Kartenfenster** (Bildschirmfoto 15:20): Projektliste lag darüber; `.pj:has(.cardwin) .pc__tablewrap { position: static; z-index: auto }` – im Browser geprüft.
5. gpm-Test zählt jetzt 203 F-Punkte (F-238), neuer Test V142 (`orgLabel`, `weeksToMonths`, Balkenplan „Vorgänger“, Auslastung „Menge Ph“). Handbuch 7.1 „Alles wie im Report“, Änderungsverzeichnis V142, `APP_VERSION = 'V142'`, Live-Projekt V142 (206 F-Punkte, 3 ersetzt, 128 fertig, 26 teilweise, 49 offen).

## Prüfliste für Enrico (zusätzlich zu V77–V141)

- Formulare › **2.2 Zielhierarchie**: Spalten L1 · L2 · S · T · K · N, Legende unter „Soziale Ziele“, „45 % v.B.“ auf einer Zeile.
- **6.1 Organigramm**: Namen groß, „Auftraggeber“ als Reiter über Hr. Meier, „Projektleitung“ rot, Dienstleister je Firma farbig.
- **7 Phasenplan (Grafik)**: Jahrespfeil, Meilensteine an den Phasen, Daten rot unter „Projektmonat“.
- **8 PSP**: Kopf mit „CG-1“, Legende in der Lücke.
- **8.3 Arbeitspaketbeschreibung**: Blatt mit vier Spalten, dunkler Kopf; Felder weiter bearbeitbar (Tab, Enter, Esc).
- **9 Balkenplan**: Spalten Anfang, Ende, Vorgänger.
- **10 Auslastungsdiagramm**: Monate statt Wochen, Kürzel in den Säulen.
- Beliebige Tabelle (z. B. 6.3 DKI-Matrix): Kopf dunkelgrau, Rahmen schwarz, Codes weinrot; Kontrastmodus schwarz auf weiß.
- Netzplan › Kasten › „Notiz öffnen“ → Fenster liegt über der Projektliste, auch beim Scrollen.
- Bericht (PDF) mit den neuen Grafiken.
- **iPad:** Kritzeln mit dem Apple Pencil in Formularfeldern, Notizen und Suche.

## Kleine Punkte (neu in V142)

- Statusbericht (12) noch Liste statt Blatt wie Abb. 15/Report-Seite; Steckbrief/Projektauftrag seit V132 unverändert.
- Report-Blätter haben QR-Code und Unterschriften – nicht nachgebaut (Unterschrift kommt mit F-238 S6).
- Balkenplan-Kopf: Quartale/Kalenderwochen wie MS Project fehlen (nur Monate).
- Phasenplan: Meilenstein-Kürzel können sich bei sehr nahen Terminen überlagern.
- Org-Legende nennt nur „intern“/„extern (je Firma)“; Abkürzungen (QMB, TL, AWT) wie im Report fehlen.
- `tmp142` in `Claude outputs` löschen (Freigabe nötig).
- Kleine Punkte aus V141/V140 bleiben offen.

### Ältere offene Punkte

Unverändert in `V141_Uebergabe_E-Sources.md`, `V140_…` bis `V131_…`.

## Commit-Text V142 (e-sources)

**Summary:** `V142: Formulare und Grafiken wie im Report, Arbeitspaketbeschreibung als Blatt, Netzplan-Kartenfenster über der Projektliste, Doc F-238 Handschrift`

**Description:**
```
- Zielhierarchie und PSP wie Abb. 4/10: Kopf mit Projektname, Ziel und Nummer, Spaltenfolge L·S·T·K·N, Legende in der freien Fläche, Kästen fett mit Glanz
- Organigramm wie Abb. 7: Name groß, kurze Funktion, Projektleitung rot, Reiter Auftraggeber, externe Dienstleister je Firma farbig
- Phasenplan wie Abb. 9: Jahrespfeil, Meilensteine an ihrer Phase, Daten rot unter „Projektmonat“
- Balkenplan wie Abb. 13 mit Anfang, Ende, Vorgänger; Auslastungsdiagramm je Monat wie Abb. 14; AP-Statusbericht mit Projektziel und Rahmen
- Arbeitspaketbeschreibung (8.3) als Blatt mit vier Spalten wie Abb. 11; alle Tabellen mit dunklem Kopf, schwarzem Rahmen, Codes weinrot
- Fehler: Kartenfenster im Netzplan lag unter der stehenden Projektliste
- F-238 Handschrift mit Apple Pencil: Entscheidungs-Doc, entschieden (überall, speichern wie Sprachnotizen), Lastenheft
- Tests 749 (+1 gpm); Handbuch 7.1, APP_VERSION V142, Live-Projekt V142, Übergabe V142

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q7rD6k1weGCrsnSqFR
```
