# Übergabe V152 → V153 E-Sources

Stand: 28.11.2026 · Chat V152 · Nächster Chat: **V153 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V153 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-232 „Gebaut V152“**, „Gebaut V151“, **F-236**, **F-232** (P11–P14), **F-231 K14** und **F-227** (Handbuch). **Zuerst nachsehen**, ob Enrico die Docs beantwortet hat (Docs-Werkzeug `export` als Markdown mit `container {kind: project, id: <slug>}` und `file: <Tab-Id>`, Text aus `bytes_b64`, Spalte „Antwort Enrico“; dazu `query` auf Kommentare): **K14 Eingang** https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (slug `1f932d32-5298-47db-a07a-ae2aff724402`, Tab `0bcc4a34-acc2`, Rev. 6), **F-236** https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (slug `86f1bcf4-6665-41c5-a49e-e0efa360a368`, Tab `a8d6803d-5122`, Rev. 6), **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (slug `73d2b875-eebd-4aea-9220-1577159be211`, Tab `46a5e669-c1bd`, Rev. 17). Stand V152: alle drei unbeantwortet, keine Kommentare. Beantwortet → Doc anpassen („io“), PDF erneuern, Lastenheft nachziehen, bauen (F-236 B schließt P11 ein). **Sonst:** Die kleinen Punkte, die ohne Enrico gehen, sind erledigt – Rest wartet auf seine Entscheidung oder auf K14 (siehe unten). Dann am besten **Enrico fragen**, ob er eine der offenen Entscheidungen (K14, F-236, F-232 P11–P14, Punkte unten) jetzt treffen will; sonst Lastenheft nach offenen F-Punkten durchsehen, die ohne Entscheidung gehen (Funktion vor Design). **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Browser-Hinweise `V150_…`, kleine Punkte aus `V74_`–`V152_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink qr`; Aufruf `timeout 175 bash $HOME/vt2/run.sh 2>&1 | grep -E "grün|FAIL|==" | paste - -` mit `timeout_ms: 180000`. Tests V152: **788** grün (`workspace` 529, `gpm` 81). `npx tsc --noEmit -p .` sauber.

**Browser (V152):** `browser.tabs.create("http://localhost:2910/?projekt=pj-cg")`, Ansicht per Rad (`slider` „Ansicht des gewählten Projekts“, 4× ArrowRight von Formulare → Entscheidungen). Blatt: `article[aria-label^="Entscheidungsvorlage"]`; Werkzeug: `article.dc__tool`, Muss-Kästchen `getByRole('checkbox', {name: /: Preis$/})`. Beispiel danach wieder löschen.

## Was in V152 passiert ist

1. **Docs geprüft:** K14, F-236, F-232 (P11–P14) unbeantwortet (Rev. 6/6/17), keine Kommentare.
2. **Browser-Blick V150/V151** (Blatt Entscheidungsvorlage, Beispiel angelegt und gelöscht): ↑/↓ (auch Enter auf dem Pfeil, Fokus bleibt), Randpfeile ausgegraut, Bewertungsspalten ziehen mit; „Gewichten“ → Vorschlag 40 %, bei voller Summe leer; ✕ + Rückgängig – alles i. O.
3. **Mangel behoben:** Nach „Rückgängig“ (Blatt) ging der Fokus auf `body`, die Bestätigung kam nur als Ansage. Jetzt `useFieldMsg`: Meldung schließen, dann Rückgängig; Rückgängig meldet am Ort (`tell('addCrit'|'addOpt', T.undone)`) und setzt den Fokus in den Namen (`paper-crit-…`/`paper-opt-…`). Im Browser geprüft.
4. **NF-08 Werkzeug:** Kästchen „Muss“ aus → Gewicht = Rest bis 100 % (`Dc.restWeight`), Meldung im Gewichtsfeld (`.dc__note`, `DS.mustOffRest/mustOffSaid/mustOnSaid`), Fokus ins Feld (`data-tool-weight`). Im Browser geprüft.
5. **Bilder in Anlage A** (kleiner Punkt V149): `Rp.reportPicRefs(ws, pid)`, `ProjectForms` lädt die Bilder vorab als Daten-URL (wie die Tinte, `PIC_EVENT`), `reportHtml(…, { pics })` → `annexSheets` bettet `<figure>` ein (nur `data:image/…`), Rest „n Bilder nur im Gerät gespeichert“. Test +1. **Nicht im Browser geprüft** (keine Testdaten in Enricos Meldungen).
6. Handbuch (Stand V152, Kap. 7 und 9, Änderungsverzeichnis); Lastenheft F-232 „Gebaut V152“; `APP_VERSION = 'V152'`; Live-Projekt V152 (206 F-Punkte, 3 ersetzt, 129 fertig, 26 teilweise, 48 offen).
7. **Portfolio (Nachtrag Enrico nach cpo V151):** „Aktuell“ neu geordnet (Weiterbildung → E-Sources mit Demo-Knopf im Abschnitt → Portfolio-Webseite), „Offen für neue Aufgaben“ steht im Kontakt-Abschnitt. Die Angabe „Portfolio unverändert“ in V151 ist damit überholt. In V152 nichts Neues fürs Portfolio.

## Prüfliste für Enrico (zusätzlich zu V77–V151)

- Entscheidungen › **Blatt**: ✕ bei einem Kriterium/einer Lösung → „Rückgängig“ → Meldung „… ist wieder da“ steht unter der Tabelle, Cursor im Namen der Zeile.
- Entscheidungen › **Werkzeug** › Schritt Kriterien: Kästchen „Muss“ an → Meldung in der Zeile; wieder aus → Gewicht = Rest bis 100 %, Cursor im Feld, Meldung nennt den Vorschlag.
- Meldung mit Bild am Projekt → **Bericht** öffnen → Anlage A zeigt die Bilder („Bild 1“ …), auch im Druck/PDF.
- Weiter offen aus V151/V150/V149 (Blatt ↑↓ selbst ausprobieren, lange Namen, Druck ohne Knöpfe, Meldungen › Blatt › „Bearbeitung und Spur“).

## Kleine Punkte

- **Enrico entscheidet:** Spur in Anlage A auch ohne Bearbeitung; F-234 ●/◐ im Lastenheft angleichen; eigene Reihenfolge im Eisenhower-Feld (V139/V140).
- **Freigabe nötig:** `Projects/Claude outputs/v149` (und `v148`, `v147`, `tmp142`, `v146`) löschen.
- **Hängt an K14:** Regel-Auslöser „Notiz kommt in den Eingang“, Tour um den Eingang, Entwürfe im Eingang zählen (V141).
- Unverändert: NF-01 (Apple-Texterkennung), Tinte gerätegebunden, Fußzeile in Browsern ohne Seitenrand-Felder, F-211 (Rechte/Server). Sonst unverändert in `V151_…` bis `V131_…`.

## Commit-Text V152 (e-sources)

**Summary:** `V152: Rückgängig am Ort, Gewicht-Vorschlag im Werkzeug, Bilder in Anlage A`

**Description:**
```
- Blatt Entscheidungsvorlage im Browser geprüft (↑↓, Gewichten, ✕/Rückgängig)
- Behoben: nach „Rückgängig“ Meldung am Ort und Fokus im Namen der Zeile (vorher Fokus verloren)
- Werkzeug › Kriterien: „Muss“ aus schlägt den Rest bis 100 % vor, Meldung im Gewichtsfeld, Fokus dorthin (NF-08)
- Bericht: Bilder der Meldungen in Anlage A eingebettet (vorab als Daten-URL geladen), fehlende als Anzahl
- Tests 788 (+1); Handbuch V152, Lastenheft F-232, APP_VERSION V152, Live-Projekt V152, Übergabe V152

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q7kpA8kCBDqNY2syiZ
```
