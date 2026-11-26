# Übergabe V113 → V114 E-Sources

Stand: 26.11.2026 · Chat V113 · Nächster Chat: **V114 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V114 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-226** (Absatz „Gebaut V113 (Stufe 2)“), **F-228** („V113“), **F-229** („Nachbesserung V113“), **F-227** (Handbuch) und **F-206 Schritt 10**. Docs: F-226 https://claude.ai/artifact/QxM6UPG6NFaAgkJwsb8EVy, F-228 https://claude.ai/artifact/UUvw5HtX9663ESsT4tS5my, F-222 V108 https://claude.ai/artifact/MXgwEhtFcAJSLYc13zbZd8. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Trello**, **IPMA ICB4 / GPM-Leitfaden Z01D Rev. 09**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V113_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. Erst Enricos Rückmeldungen zu V113 abholen (Formulare Stufe 2, Bericht als PDF), dann „Nächste Schritte“ ab 1 **bauen**.

**Tests** (VM ist nach jedem Chat leer – neu anlegen):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOF'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in workspace persons stage noteSources gpm; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOF
bash $HOME/vt2/run.sh
```

## Was in V113 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace **526**, persons 17, stage 4, noteSources 1, gpm **36** (8 neu) – alle grün.

1. **F-229 Anfasser (Enrico 09:54: „Kümmere dich zuerst um die richtige Position der Anfasser“):** Ursache bei schmalem Fenster – `Pad.fit` hielt im Notizen-Modus die Mindestgröße 260 × 200 px ein und schob Pads über den Nachbarn, während Baum und `.notegrip` die echte Aufteilung zeigten (im Testbrowser lag Notizblock 3 halb über Notizblock 2, ↔ mitten im Pad). Jetzt in `Pad.tsx`: `const p = tile && !live ? place : …` – gekachelt gilt die Kachel genau, zu schmale Pads werden knapp (Überlauf F-228). Nachgemessen: alle Anfasser mittig in den Lücken. Enrico: „so kann das erstmal bleiben“.
2. **F-226 Stufe 2** (Doc F-226, Spalte „Stufe 2“): Abnahmekriterien (3.1), AKV an den Rollen (6.2), Kommunikationsplan/DKI-Matrix (6.3), Arbeitspaketbeschreibung mit Fortschrittsmessung (8.3, Einzelansicht), Statusbericht mit eingefrorenem Stand (12, Einzelansicht), Kostenganglinie mit Summenlinie und Budget (11), Umfeld- und Stakeholder-Portfolio (4, Grafik + Tabelle), Projektbericht als HTML mit `@page`-Kopf/Fuß und Querformat für breite Tabellen (Knopf „Bericht“, im Browser als PDF sichern). Neue Dateien `workspace/gpmCalc.ts` (Rechnungen) und `workspace/gpmReport.ts` (Bericht, SVG-Bausteine). Einzelheiten im Lastenheft F-226 „Gebaut V113“.
3. **F-228 Rest:** Rad „+ Sheet“ zeigt in der schwebenden Leiste die vollen Namen (`headOvf.open`).
4. Handbuch 7.1 (Stand V113) und Änderungsverzeichnis, Hilfe „Formulare“ (Text, Suchwörter, Fragen), Lastenheft F-226/F-228/F-229, `APP_VERSION = 'V113'`.

**Im Browser geprüft (eingebauter Browser, `localhost:2910/?test=voll`):** Notizen-Modus mit 4 Pads bei 706 und 1200 px (Pads ohne Überlagerung, 5 Anfasser in den Lücken); Formulare über das Pad im Vollbild (Ereignis `esource:workpad` mit `{tab:'forms', project:'pj-cg'}` nach ⚙ › Beispielprojekt): Kostenganglinie (7 Monate, 372.364 €), beide Portfolios, Statusbericht anlegen (Stand eingefroren), Arbeitspaketbeschreibung, Abnahmekriterien mit Ziel-Auswahl, AKV-Spalten. Bericht aus dem Beispielprojekt mit Chrome als PDF gerendert (27 Seiten, Kopf/Fuß und „Seite x von y“ stimmen, Querformat bei breiten Tabellen) – Datei `Projects/Claude outputs/v113/Projektbericht_Beispiel.html` (nicht im Repo).
**Nicht im Browser geprüft:** Knopf „Bericht“ mit echtem neuem Fenster (im eingebauten Browser sind Fenster gesperrt → Druckdialog-Weg), Rad „+ Sheet“ mit langen Namen in der schwebenden Leiste, senkrechte Lage (bei 800 px passt die Kopfleiste noch waagerecht).

## Nächste Schritte

1. **Enrico fragen:** Formulare Stufe 2 und Bericht ansehen (Projekt-Modus › Formulare, Knopf „Bericht“) – passt Aufbau und Inhalt zum GPM-Report?
2. **F-226 Rest Stufe 2 (ICB4-Ergänzungen laut Doc):** Meilenstein-Trendanalyse (4.5.4, aus Basisplänen), Formular „Dokumentation“ (4.5.5), Prüfung am Lieferobjekt (4.5.6), Earned Value/SPI/CPI (4.5.7 – `projectStatus.earned` gibt es schon), „Abschluss und Lessons Learned“ (4.5.10), „Veränderung“ (4.5.13), „Auflagen“ (4.3.3). Tour „Formulare“ um die neuen Kapitel und den Knopf „Bericht“ erweitern.
3. Dann Schritt 10 laut Stufenplan (Basisplan, Netzplan, F-220, Projekt-Desk).
4. **Prüfliste für Enrico** (alles aus V77–V112 plus):
   - Seite neu laden, dann `npm test` in `web/`.
   - Notizen-Modus mit 3–4 Pads, Fenster schmal ziehen: Pads überlagern sich nie, Anfasser ↔ ↕ ⤡ bleiben mittig in den Lücken.
   - ⚙ › Beispielprojekt entfernen und neu anlegen (bekommt sonst keine neuen Inhalte), Projekt-Modus › Formulare.
   - 3.1 Abnahmekriterien: Angaben eintragen, „abgenommen“ anhaken, neues Kriterium an einen gewählten Meilenstein; in der Notiz unter „Abnahme“ dasselbe Kriterium.
   - 4 Umfeld- und Stakeholder-Portfolio: Grafik; in der Tabelle darunter „Umfeld“ setzen → Kürzel springt ins Feld.
   - 6.2 AKV ausfüllen; „Besetzt mit“ ändern → AKV bleibt. 6.3 DKI: Zeilen anlegen, verschieben.
   - 8.3 Arbeitspaketbeschreibung: Liste und ‹ › blättern, Fortschrittsmessung wählen → Fertigstellungsgrad „gerechnet“, Eingabe von Hand geht vor.
   - 11 Kostenganglinie: Balken, rote Summenlinie, grüne Budgetlinie, Werte je Monat.
   - 12 Statusbericht: „+ Zeile“ → Stand eingefroren, Ampel-Vorschlag; zweiter Bericht beginnt am Tag nach dem ersten.
   - Knopf „Bericht“: neues Fenster mit Deckblatt, Inhalt, allen Kapiteln; „Drucken bzw. als PDF sichern“ → Kopf-/Fußzeile, Seite x von y, Querformat bei breiten Tabellen.
   - Pad-Kopf schmal ziehen, Leiste schweben lassen: Rad „+ Sheet“ zeigt Notizblock, To-do-Liste, Kanban-Board, Eisenhower-Matrix.

## Kleine Punkte (neu in V113)

- **Neue Dateien per `device_commit_files`:** Eine frisch in `/mnt/user-data/outputs/` geschriebene Datei ist nicht sofort lesbar – einmal kam beim Übertragen der alte Stand an. Nach dem Übertragen auf dem Gerät mit `grep` prüfen, sonst kurz warten und erneut übertragen.
- **Lange Befehle:** `device_bash` lehnt sehr lange Befehle ab (Heredoc mit Python-Patch über ca. 14 kB) – Patch-Skripte als Datei nach `Projects/Claude outputs/v113/` legen und dort ausführen.
- **Testbrowser:** Räder (`ModeWheel`) drehen per Taste/Scrollen nur, solange die Seite gezeichnet wird; ist der Browser verdeckt, bleibt der Wert stehen. Formulare-Kapitel zuverlässig über `localStorage['esource.formChapter.v1']` setzen und die Reiter Entscheidungen → Formulare im Pad wechseln. Bei `?test=voll` gibt es kein Projekt – ⚙ › Beispielprojekt; nach Neuladen der Seite (z. B. durch Änderungen an `Overflow.tsx`) ist es wieder weg.
- **Bericht als Datei prüfen:** `$HOME/vt2/rep.js` (in der VM, neu anlegen) erzeugt aus dem Beispielprojekt `Projektbericht_Beispiel.html`; im Cloud-Container rendert `google-chrome --headless=new --no-sandbox --print-to-pdf` daraus ein PDF, `pdftoppm` macht Bilder.
- Zeilen-Id der Abnahmekriterien ist `<Notiz-Id>#<Index>` – nach Löschen verschieben sich die Indizes; Rückgängig stellt die ganze Liste der Notiz wieder her.
- Statusbericht: Ampel-Vorschlag gelb/rot, wenn Leistung mehr als 10 Prozentpunkte hinter Termin bzw. Kosten liegt.
- Fortschritt Termin ist 0 %, solange der Stichtag vor dem Projektstart liegt (Beispielprojekt startet 01.12.2026).
- Umfeld-Portfolio im Beispielprojekt leer (11 ohne Angabe): Der Report nennt kein „sachlich/sozial“ je Stakeholder – nicht erfunden.

## Commit-Text V113 (e-sources)

**Summary:** `V113: Formulare Stufe 2 (Abnahme, AKV, DKI, Arbeitspaket, Statusbericht, Ganglinie, Portfolios, Bericht als PDF), Anfasser im Notizen-Modus auch im schmalen Fenster in der Lücke`

**Description:**
```
- F-229: Im Notizen-Modus liegen Pads genau in ihrer Kachel, auch wenn das Fenster für die Mindestgröße zu schmal ist – keine Überlagerung mehr, Anfasser immer mittig in der Lücke
- F-226 Stufe 2: Abnahmekriterien mit Datum, Leistung von, Abnahme durch, Prüfdokument; AKV an den Rollen; Kommunikationsplan (DKI-Matrix); Arbeitspaketbeschreibung mit Fortschrittsmessung; Statusbericht mit eingefrorenem Stand und Ampel-Vorschlag
- Kostenganglinie mit Summenlinie und Budget, Umfeld- und Stakeholder-Portfolio als Grafik
- Projektbericht: alle Formulare in Kapitelfolge mit Kopf- und Fußzeile (Seite x von y), breite Tabellen im Querformat, drucken bzw. als PDF sichern
- F-228: Rad „+ Sheet“ zeigt in der schwebenden Leiste die vollen Namen
- Handbuch V113, Hilfe „Formulare“, Lastenheft F-226/F-228/F-229, Tests gpm 36, Übergabe V113

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q4ayzB3KbDpTq5h6jA
```
