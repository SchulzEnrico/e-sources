# Übergabe V115 → V116 E-Sources

Stand: 26.11.2026 · Chat V115 (Enrico unterwegs, Claude allein weitergebaut) · Nächster Chat: **V116 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V116 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-226** (Absätze „Gebaut V114“ und „Gebaut V115“), **F-206 Schritt 10** (Absatz „Gebaut V115“, „Offen in Schritt 10“), **F-220**, **F-227** (Handbuch). Docs: F-226 https://claude.ai/artifact/QxM6UPG6NFaAgkJwsb8EVy, F-228 https://claude.ai/artifact/UUvw5HtX9663ESsT4tS5my, F-222 V108 https://claude.ai/artifact/MXgwEhtFcAJSLYc13zbZd8, Schritt 9/10 V96 https://claude.ai/artifact/B8bKXzxLhqACZrJ2T1gmgE, Datenmodell V98 https://claude.ai/artifact/7H8PyejdbccEeJzj3SrKXF. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Trello**, **IPMA ICB4 / GPM-Leitfaden Z01D Rev. 09**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V115_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. Enricos Rückmeldung zu den Formularen Stufe 2 und zum Bericht (PDF) steht noch aus – aufnehmen, wenn er sie bringt; sonst „Nächste Schritte“ ab 1 **bauen**.

**Tests** (VM ist nach jedem Chat leer – neu anlegen):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in workspace persons stage noteSources gpm; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```

## Was in V115 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 17, stage 4, noteSources 1, gpm **43** (5 neu) – alle grün.

1. **Earned Value im Browser geprüft** (läuft, Zahlen deutsch) und nachgebessert: Summenzeile „Projekt (Stichtag …)“ jetzt auch in der Tabelle, Euro ganz oder mit genau zwei Nachkommastellen (vorher „6.914,4 €“) – gemeinsam `Fk.fmtNumber` für Oberfläche und Bericht, SPI/CPI immer zwei Stellen (`FieldSpec.digits`), gerechnete Formulare ohne Papierkorb (`canRemoveRow`; vorher stand an jeder EV-Zeile ein wirkungsloser Löschknopf), Zahlen rechts, Text links.
2. **F-226 Stufe 2 komplett** (Vorlage 28 Formulare): 2.4 Auflagen, 6.4 Dokumentation, 7 Meilenstein-Trendanalyse (gerechnet, Grafik + Tabelle; Statusbericht hält die Meilenstein-Termine fest), 9 Prüfung am Lieferobjekt, 13 Veränderung, 14 Projektabschluss (Felder), 14 Lessons Learned. Datenmodell optional am Projekt (`rules`, `docs`, `checks`, `changes`, `lessons`, `close`, `StatusReport.ms`), Dateiformat 11 bleibt. Tour „Formulare“ erweitert (alle Kapitel, „Gerechnete Formulare“, „Bericht“), Hilfe ergänzt.
3. **Schritt 10: Basisplan** im Gantt (`workspace/baseline.ts`): speichern/ersetzen/löschen mit Rückgängig am Ort, grauer Soll-Balken, Spalten „Basis Ende“/„Abw. Ende“, Kopfzeile mit Abweichung Ende/Kosten; MTA nimmt ihn als ersten Punkt.
4. **Schritt 10: Netzplan** als neue Ansicht (Rad „Ansicht“ jetzt 9: … Gantt · **Netzplan** · Risiken …), `workspace/network.ts` + `components/ProjectNetwork.tsx`; im Browser angesehen (33 Vorgänge, 45 Abhängigkeiten, 11 kritisch – wie Gantt).
5. Handbuch 7 und 7.1 (Stand V115, Änderungsverzeichnis), Hilfe „Basisplan (Soll/Ist)“ und „Netzplan“, Begriffe, Lastenheft F-226 „Gebaut V115“ und F-206 Schritt 10 „Gebaut V115“, `APP_VERSION = 'V115'`.

**Im Browser gesehen:** Earned Value (vor und nach dem Fix), MTA (Grafik, Tabelle), Netzplan. **Nicht im Browser gesehen** (das Rad „Ansicht“ ließ sich im verdeckten, schmalen Browserfenster nicht zuverlässig drehen): Basisplan im Gantt, Formulare Auflagen/Dokumentation/Prüfung/Veränderung/Abschluss/Lessons Learned – Logik durch Tests abgedeckt, stehen auf der Prüfliste.

## Nächste Schritte

1. **F-220** Umschalt-Räder nach Nutzung ordnen, fest anheften und belegen (entschieden V100, zuerst Cockpit-Haupt-Rad) – Lastenheft lesen, dann bauen.
2. **Projekt-Desk** (J1 D3: nach dem Projekt-Modus) – vorher kurz ein Claude Doc an der Seite, falls offene Grundsatzfragen (Regel Enrico).
3. Rest Schritt 10: Ressourcen-Ansicht im Projekt (Einsatz je Ressource über die Zeit, MS Project „Ressource: Einsatz“), Task-Limit je Projekt, Feiertage/eigene Kalender (K7: ColorGentlemen endet sonst 22.06. statt 30.06.).
4. Später: Earned Value als Grafik (PV/EV/AC über die Zeit), Tour „Projekte“ um Netzplan und Basisplan ergänzen.
5. **Prüfliste für Enrico** (alles aus V77–V114 plus):
   - Seite neu laden, dann `npm test` in `web/`.
   - ⚙ › Beispielprojekt entfernen und neu anlegen (bekommt sonst keine neuen Inhalte).
   - Formulare › 11 Earned Value: letzte Zeile fett „Projekt (Stichtag …)“, „6.914,40 €“ statt „6.914,4 €“, CPI „1,00“, kein Papierkorb an den Zeilen.
   - Formulare › 12 Statusbericht „+ Zeile“, dann › 7 Meilenstein-Trendanalyse: Grafik mit Punkten „TT.MM.“ und „heute“, Tabelle mit Abweichung und Trend. Im Gantt Dauer eines kritischen Vorgangs erhöhen → in der MTA steigt die Linie, Abweichung +n.
   - Formulare › 2.4 Auflagen, 6.4 Dokumentation, 9 Prüfung am Lieferobjekt, 13 Veränderung, 14 Lessons Learned: „+ Zeile“ (Nummern A-1, D-1), Auswahlfelder, Löschen mit Rückgängig. 14 Projektabschluss: Felder ausfüllen, Häkchen „Dokumentation archiviert“.
   - Knopf „Bericht“: neue Kapitel erscheinen in der Reihenfolge, MTA als Grafik.
   - Tour „Formulare“: Kapitel-Text, Schritt „Gerechnete Formulare“, Schritt „Bericht“.
   - Gantt: „Basisplan speichern“ → Meldung mit „Rückgängig“, graue Balken unter den Vorgängen, Spalten „Basis Ende“/„Abw. Ende“; Dauer eines Vorgangs ändern → „+n AT“ rot, Kopfzeile „Ende +n AT“; „Basisplan ersetzen“, „Basisplan löschen“, „Basisplan zeigen“ aus/an.
   - Ansicht › Netzplan: Kästen mit FA/Dauer/FE und SA/Puffer/SE, kritischer Pfad rot, Pfeile; Tastatur Pfeile/Pos1/Ende/Enter; unten Vorgänger/Nachfolger und „Notiz öffnen“.

## Kleine Punkte (neu in V115)

- Browser-Test im eingebauten Browser: Beispielprojekt am zuverlässigsten über ⚙ (Kopfleiste per Tastatur öffnen: Fokus auf „Kopfleiste: … weitere“, Pfeil runter), Projekt-Modus über die Suche „Tour Projekte“ (wechselt in den Modus, Esc beendet die Tour), Formular direkt über `localStorage['esource.formChapter.v1']` bzw. Ansicht über `esource.projectView.v1` vor dem Wechsel setzen. Das Rad „Ansicht“ dreht per Klick (Pendel), Pfeiltasten wirken nicht immer, wenn das Fenster verdeckt ist.
- `chart`-Darstellung ist nicht mehr gleich Kostenganglinie: `form.source` entscheidet (`costs` → Ganglinie, `mta` → MTA).
- Netzplan: geerbte Bezüge über Sammelvorgänge werden ohne Umwege gezeichnet (transitive Reduktion nur für geerbte, eigene Bezüge bleiben alle).

## Commit-Text V115 (e-sources)

**Summary:** `V115: Formulare Stufe 2 komplett (MTA, Auflagen, Dokumentation, Prüfung, Veränderung, Abschluss, Lessons Learned), Basisplan im Gantt, Netzplan`

**Description:**
```
- Earned Value: Summenzeile in der Tabelle, Euro mit zwei Nachkommastellen, SPI/CPI „1,00“, gerechnete Zeilen ohne Löschknopf
- F-226 Stufe 2 komplett (28 Formulare): Meilenstein-Trendanalyse aus Basisplan und Statusberichten, Auflagen, Dokumentation, Prüfung am Lieferobjekt, Veränderung, Projektabschluss, Lessons Learned – auch im Bericht
- F-206 Schritt 10: Basisplan speichern/ersetzen/löschen mit Rückgängig, Soll-Balken und Abweichung im Gantt; neue Ansicht Netzplan (FA/FE/SA/SE, Puffer, kritischer Pfad)
- Tour und Hilfe „Formulare“, Hilfe „Basisplan“ und „Netzplan“, Handbuch V115, Lastenheft, Tests gpm 43, Übergabe V115

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q79LTUeWJ6XyHNrYVT
```
