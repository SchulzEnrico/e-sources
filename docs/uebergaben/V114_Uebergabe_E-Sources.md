# Übergabe V114 → V115 E-Sources

Stand: 26.11.2026 · Chat V114 (kurz, Enrico um 10:45 unterwegs) · Nächster Chat: **V115 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V115 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-226** (Absätze „Gebaut V113“ und „Gebaut V114“), **F-228**, **F-229**, **F-227** (Handbuch) und **F-206 Schritt 10**. Docs: F-226 https://claude.ai/artifact/QxM6UPG6NFaAgkJwsb8EVy, F-228 https://claude.ai/artifact/UUvw5HtX9663ESsT4tS5my, F-222 V108 https://claude.ai/artifact/MXgwEhtFcAJSLYc13zbZd8. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Trello**, **IPMA ICB4 / GPM-Leitfaden Z01D Rev. 09**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V114_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. Enricos Rückmeldung zu V113 (Formulare Stufe 2, Bericht als PDF) steht noch aus – er sagte in V114 „Mach weiter im Plan“; Rückmeldung nur aufnehmen, wenn er sie bringt, sonst „Nächste Schritte“ ab 1 **bauen**.

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

## Was in V114 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 17, stage 4, noteSources 1, gpm **38** (2 neu) – alle grün.

1. **F-226 Stufe 2 Rest, Teil 1: Earned Value (ICB4 4.5.7).** Neues Formular „Earned Value (Fertigstellungswert)“ in Kapitel 11 (nach Kostenganglinie, vor Beschaffung), Quelle `ev` (`types.ts` `FormSource`), nur lesen, ohne „+ Zeile“ (`canAddRow`). Spalten Code, Arbeitspaket, BAC, PV, EV, AC, SV, CV, SPI, CPI, EAC mit Hilfe-Texten. Rechnung `earnedValue(ws, pid, day)` in `workspace/gpmCalc.ts`: PV = Plan-Kosten × Anteil verstrichener Arbeitstage im Gantt (vor Beginn 0, ab Ende 1), EV = Plan-Kosten × `progressOf`, AC = Ist-Kosten von Hand, SPI/CPI nur bei PV/AC > 0, EAC = BAC ÷ CPI sonst BAC. Stichtag `Fk.evDay()` = heute. Bericht (`gpmReport.ts`): Summenzeile „Projekt (Stichtag TT.MM.JJJJ)“. Vorlage jetzt 21 Formulare (Test der Kapitelfolge angepasst).
2. Handbuch 7.1 (Stand V114, Absatz „Earned Value (11)“, Änderungsverzeichnis V114), Hilfe „Formulare“ (Text, Suchwörter, Frage), Lastenheft F-226 „Gebaut V114“, `APP_VERSION = 'V114'`.

**Nicht im Browser geprüft** (keine Zeit): Formular „Earned Value“ in der Oberfläche (Tabelle wie Kostenganglinie-Werte, Zahlen deutsch formatiert erwartet), Earned Value im Bericht. Als Erstes in V115 im eingebauten Browser ansehen (`localhost:2910/?test=voll`, ⚙ › Beispielprojekt, Formulare › Kapitel 11).

## Nächste Schritte

1. Earned Value im Browser prüfen (s. o.); SPI/CPI mit zwei Nachkommastellen anzeigen, falls die Zahl-Darstellung rundet.
2. **F-226 Rest Stufe 2:** Meilenstein-Trendanalyse (4.5.4, aus Basisplänen – braucht Schritt 10 Basisplan; bis dahin aus den Statusberichten), Formular „Dokumentation“ (4.5.5), Prüfung am Lieferobjekt (4.5.6), „Abschluss und Lessons Learned“ (4.5.10), „Veränderung“ (4.5.13), „Auflagen“ (4.3.3). Tour „Formulare“ um die neuen Kapitel und den Knopf „Bericht“ erweitern. Später: Earned-Value-Grafik (PV/EV/AC über die Zeit).
3. Dann Schritt 10 laut Stufenplan (Basisplan, Netzplan, F-220, Projekt-Desk).
4. **Prüfliste für Enrico** (alles aus V77–V113 plus):
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
   - Formulare › 11 Earned Value: je Arbeitspaket BAC, PV, EV, AC, SV, CV, SPI, CPI, EAC; im Bericht Summenzeile „Projekt (Stichtag …)“. Im Beispielprojekt vor dem 01.12.2026 sind PV und EV 0 – Fertigstellungsgrad in 8.3 von Hand setzen, dann ändern sich EV, SPI, CPI.

## Kleine Punkte (neu in V114)

- Patch-Skripte liegen in `Projects/Claude outputs/v114/` (nicht im Repo).
- Earned Value rechnet bei jedem Aufruf `ganttOf` neu (je Zeile); bei großen Projekten ggf. zwischenspeichern, wenn die Tabelle träge wird.

## Commit-Text V114 (e-sources)

**Summary:** `V114: Formular Earned Value (BAC, PV, EV, AC, SV, CV, SPI, CPI, EAC) in Kapitel 11, im Bericht mit Summenzeile`

**Description:**
```
- F-226 Stufe 2: Formular „Earned Value (Fertigstellungswert)“ nach ICB4 4.5.7 – je Arbeitspaket Planwert aus dem Gantt, Fertigstellungswert aus dem Fertigstellungsgrad, Ist-Kosten, Abweichungen, SPI, CPI und Kostenprognose zum heutigen Tag
- Projektbericht: Earned Value mit Summenzeile für das ganze Projekt
- Handbuch V114, Hilfe „Formulare“, Lastenheft F-226, Tests gpm 38, Übergabe V114

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q5WJUzf6KU17eded1b
```
