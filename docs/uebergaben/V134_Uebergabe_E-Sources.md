# Übergabe V134 → V135 E-Sources

Stand: 27.11.2026 · Chat V134 · Nächster Chat: **V135 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V135 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-234** (neu, entschieden), **F-233** („Gebaut V134“), **F-232** („Nachtrag V134“, P11–P14 weiter offen) und **F-227** (Handbuch). **Zuerst:** im Entscheidungs-Doc **F-234** https://claude.ai/artifact/F52Mf9LwZH3xevtkMkP7uw die Spalte „Antwort Enrico“ für D1–D8 mit „Wie Vorschlag – Aussehen wie im eigenen Report“ füllen (Enrico 11:45), PDF unter `docs/Arbeitspakete/` erneuern. **Erstes Paket V135: F-234 Option A** – Darstellungen als Kapitel-Blätter **im Aussehen des ColorGentlemen-Reports** (`docs/Arbeitspakete/Vorlagen/Report_ColorGentlemen_CG-1.pdf`, Text daneben als `.txt`): erst Grafiken aus vorhandenen Daten (Zielhierarchie, Organigramm, Phasenplan, PSP- und Gantt-Blatt, Auslastungsdiagramm), dann neue Formulare (AP-Statusbericht, Teamrollen, Eisenhower, Nachrichtenquadrat, Maßnahmenplan/Moderation, Anlagen), dann beide Beispiele füllen. **Außerdem ColorGentlemen gegen den eigenen Report abgleichen** (Enrico 11:29/11:33: DKI-Matrix 6.3 und Lessons Learned 14 fehlen; alles Fehlende nachtragen). Danach F-232 P11–P14 (wenn beantwortet), Rest P9 (Feedback, Entscheidungsvorlagen als Blatt), K14 Eingang, F-230 F7. Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **bei Dokumenten Aussehen wie im Report**, **Funktion vor Design**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V134_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Prüfdateien (F9) erst ab 07.12.** **Dashboards** zählen wie V127 über die Vermerke im Lastenheft (F-232 ◐, F-233 ● neu, F-234 ◐ neu). Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: watch**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments kanbanTimeline covers cardFields columnLook mirrors stars ruleKit buttons schedule watch}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```




**Neue Dateien anlegen:** direkt im Repo mit `device_bash` (`cat > … <<'EOF'`), Änderungen an bestehenden Dateien per `device_bash` + Python (`str.replace` mit `assert`). `device_commit_files` legte mehrmals die vorige Fassung ab (V123, V125) – meiden. **`npx tsc --noEmit -p .` braucht bis ~170 s** – mit `timeout 170` und `timeout_ms: 180000` aufrufen, sonst bricht der Aufruf ab.

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl`. **Kleine Ausgabe beim Öffnen:** `browser.tabs.create("http://localhost:2910/package.json")`, dann `browser.show()` und `tab.page.setViewportSize({ width: 1400, height: 900 })`, dann `tab.page.goto("http://localhost:2910/?test=voll")`. **Die Begrüßung oben rechts fängt Klicks ab** – in V123 blieb sie teils stehen (Fokus/Zeiger darin hält sie an): `section.greeting` › Knopf „Begrüßung schließen“ klicken oder warten. Im Testmodus: Knopf „Projekt“ (Text `^\s*Projekt$`, der letzte) → Name tippen (Feld hat den Fokus), Enter → „Kanban-Board anlegen“ → `[data-add]` klicken, Titel tippen, Enter, Esc. Termine am schnellsten über Rad „Ansicht“ › Tabelle (`.ktab input[type=date]` mit `fill`). **Rad-Wechsel brauchen ~0,7 s** je Raste (`ArrowDown` am `slider` „Ansicht“, dann warten, dann nächste Raste). Jeder Hot Reload löscht die Testdaten. Ziehen der Zeitleisten-Balken geht mit `tab.drag` in Bildpunkten (vorher `tab.screenshot()`, Bild ist halb so breit wie 1400); HTML5-Ziehen (Kalender, „Ohne Datum“) mit `DragEvent` + `DataTransfer` per `page.evaluate`.

**Browser-Hinweise (V124):** Rad „Größe“ im Kartenfenster: Klick oder Fokus + Pfeil hoch/runter (je ~0,9 s warten). Bild hochladen im Test: Canvas → `File` → `DataTransfer` an `.cardwin__cover input[type=file]`, `change` auslösen. Der Tooltip der Karte verdeckt nach dem Schließen des Kartenfensters die Spalte – vorher `tab.hover` woanders hin.

**Browser-Hinweise (V125):** Im Felder-Panel Locator auf `section.kfld` eingrenzen (es gibt mehrere Knöpfe „Anlegen“). Kartenfenster-Felder: `.cardwin__fields` › `getByLabel(/^Punkte – /)`. Taste S auf einer Karte (`[data-card]` fokussieren) stimmt ab, sobald „Abstimmen“ unten im Board an ist.

**Browser-Hinweise (V126):** Spaltenmenü über `getByRole('button', { name: /Aktionen/ })` in der Spalte; Farben sind `menuitemcheckbox`. Meldungen am Ort verschwinden nach wenigen Sekunden – „Rückgängig“ im selben Skript klicken. Die gesperrte Einklapp-Taste (`aria-disabled`) lässt sich im Test nicht klicken (für Nutzer meldet sie „Eine Spalte bleibt offen“).

**Browser-Hinweise (V127):** Spiegeln mit Taste `m` auf einer fokussierten Karte (`[data-card]`), dann Knopf mit dem Board-Namen in `.sheet__move`. Zweites Kanban im Testmodus nötig (zweites Projekt oder Kanban-Sheet über „+ Sheet“). Kartenfenster-Abschnitt: `.cardwin__mirrors`.

**Browser-Hinweise (V128):** Pad im Testmodus: Menü „Notizen & Aufgaben“ › „Neues Pad“. Der Pad-Kopf ist schmal – Knopf „Pad-Kopf: n weitere Elemente“ öffnet die ganze Leiste, dann „Pad-Optionen“. Das Menü öffnet unten und liegt teils unter dem Pad (Zeiger-Klick wird abgefangen) – Eintrag mit `focus()` + Enter auslösen. Stern am Reiter: `.pad__tabstar`, Meldung `.padfoot__hint`.

**Browser-Hinweise (V129):** Im Projekt-Modus (Testmodus) ist das Board schmal – Karte erledigen geht am sichersten mit Fokus auf `[data-card]` + **Strg+Enter** (der Erledigt-Kreis ist im Locator nicht per Name zu finden). Knopf „Automatisierung (n)“ unten im Board öffnet `section.rkit__panel`; im Editor `.rkit__edit` die Knöpfe „Bedingung“/„Aktion“ mit `exact: true` suchen (es gibt „Aktion nach oben (1)“ usw.); Auswahlen heißen „Auslöser“, „Bedingung 1“, „Aktion 1“ …, Lücken „Aktion 1: Tag setzen“ usw. Meldungen am Ort verschwinden nach 2 s (A1) – „Rückgängig“ im selben Skript klicken.

**Browser-Hinweise (V130):** Die Begrüßung blieb im Test stehen (auch nach 15 s) – per `page.evaluate` den Knopf in `section.greeting` mit „schließen“ im `aria-label` klicken. Knopf anlegen: „Automatisierung (n)“ unten im Board bzw. Kopf-Knopf „Knöpfe“ › „Knöpfe verwalten …“ → `.rkit__panel` › „Karten-Knopf“/„Board-Knopf“; im Editor `getByLabel('Art')`, `getByLabel('Wirkt auf')`, Aktionen wie bei den Regeln. Taste `b` auf `[data-card]` öffnet `.kbtn__bar`, Ziffer drückt; Kartenfenster-Abschnitt `.cardwin__buttons` mit eigener Meldung.

**Browser-Hinweise (V131):** Regel-Editor: Auslöser `getByLabel('Auslöser', { exact: true }).selectOption('weekly' | 'daily' | 'workdays' | 'monthly' | 'dueNear')`, Uhrzeit `.rkit__edit input[type=time]` mit `fill('09:00')`, Aktion „Karte aus Vorlage“ = `selectOption('fromTpl')`. Die Uhr-Regeln laufen erst 30 s nach dem Laden und dann alle 5 Minuten – im Browser nicht abwartbar; Ablauf deckt `schedule.test.ts`. Aufgeklappter Pad-Kopf: Knopf `.pad .ovf__knob` mit „Pad-Kopf“ im `aria-label`; „+ Sheet“ ist das Rad `[aria-label^="Sheet hinzufügen"]`, Klick öffnet das Menü (`.menu__list`).

**Browser-Hinweise (V134):** Kapitel der Formulare über das Rad `getByRole('slider', { name: /Kapitel/ })` (Home, dann ArrowDown, je ~0,6 s). Prüfskript für alle Kapitel (Überstand je Zelle, Tabelle breiter als Blatt) steht unten – nach jeder Blatt-Änderung laufen lassen. Beispiele im Testmodus: Knöpfe „Beispielprojekt „ColorGentlemen“ anlegen“ / „Beispielprojekt „Logistik-Center“ anlegen“. Neue große Dateien (> 100 KB Befehl) nicht per Heredoc, sondern mit `Write` im Container und `device_commit_files` ablegen (bei neuen Dateien zuverlässig).

```js
// je Kapitel: Inhalt, der über seine Zelle ragt, oder Tabelle breiter als das Blatt
() => { const paper = document.querySelector('article.paper--form'); if (!paper) return []; const out = [];
  const pr = paper.getBoundingClientRect(), pad = parseFloat(getComputedStyle(paper).paddingRight);
  for (const t of paper.querySelectorAll('table')) if (t.getBoundingClientRect().right - (pr.right - pad) > 2) out.push('Tabelle zu breit');
  for (const td of paper.querySelectorAll('td, th')) { const r = td.getBoundingClientRect();
    for (const el of td.querySelectorAll('*')) { if (el.closest('.sr-only, svg') || el.tagName === 'OPTION') continue; const e = el.getBoundingClientRect(); if (!e.width) continue;
      if (e.right > r.right + 1.5 || e.left < r.left - 1.5) { out.push(td.className + ': ' + el.className); break; } } }
  return out; }
```

## Was in V134 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: wie V133, `workspace` jetzt 528 (+2) – alle grün (**725**).

1. **F-233 zweites Beispielprojekt gebaut** (`workspace/sampleLogistics.ts`, `workspace/samples.ts`): FUTURE-P.ROOF – smarter logistics, alles aus dem Report (Steckbrief, Ziele, Konflikte, Abnahmekriterien an Meilensteinen/APs, Umfeld-Portfolio mit 10 sachlichen Faktoren, Stakeholder, 3 Risiken + Chance, 6 Rollen mit AKV, DKI-Matrix mit 10 Zeilen, Phasen, 39 Vorgänge, Einsätze je Qualifikationsgruppe = 2.998 Ph, Sachkosten, 7 Beschaffungen, AP-Beschreibung/Statusbericht FP-1.5.2, 2 Änderungen, Lessons Learned). Termine +1820 Tage: Start 26.01.2027, Ende 25.08.2027, kritischer Pfad = Abb. 11. Name der Verfasserin nicht übernommen (Test prüft). Knöpfe je Beispiel in Projektliste und ⚙, Aktion `sampleProject` mit `key`.
2. **Beide Reports im Repo** unter `docs/Arbeitspakete/Vorlagen/` (gitignore): `Report_ColorGentlemen_CG-1.pdf` (= Enricos Upload 11:40, gleiche Prüfsumme) und `Report_Logistik-Center_FP-1.pdf`, je mit `.txt`.
3. **Enricos Rückmeldungen 11:22–11:31 umgesetzt und im Browser geprüft:** Gantt-Balken laufen unter der festen Zeitleiste durch (`.gt__body` isoliert); Risiken/Änderungen über die ganze Breite (Tabelle oben, Angaben darunter), „+ +“ am Knopf weg; Formular-Blätter: Felder ohne dunklen Glasschatten, Kästchen weiß mit rotem Häkchen, flache Knöpfe, feste Spaltenaufteilung nach Spaltenart (`COL_WEIGHT` in `ProjectForms.tsx`), Umbruch überall, Zahlen linksbündig, „gerechnet“ klein unter dem Wert – **alle 28 Kapitel automatisch ohne Überstand**; Stakeholder-Portfolio neu (Quadranten, intern/extern, Legende), MTA als klassisches Dreieck; ColorGentlemen-Stakeholder „sozial“ (Umfeld-Portfolio).
4. **Projektliste (Enrico 11:46–11:49):** ganz vorn in der Namenszelle zwei Umschalt-Räder auf einer Höhe – „Projekt“ (ModeWheel, ersetzt „n Projekte ▾“; Klick auf den Namen öffnet weiter die Liste) und direkt daneben „Ansicht“ (aus der Kopfzeile hierher verschoben); die ganze Projektliste bleibt beim Scrollen oben stehen (`.pj .pc__tablewrap` sticky). Im Browser geprüft.
5. **F-234 Entscheidungs-Doc** (fehlende Darstellungen) angelegt, von Enrico 11:45 entschieden: Option A, wie Vorschlag, Aussehen wie im eigenen Report.
6. F-232 P11–P14 weiter unbeantwortet (Rev. 17).
7. Handbuch V134 (7, 7.1, Änderungsverzeichnis), Lastenheft F-232/F-233/F-234, `APP_VERSION = 'V134'`.

## Prüfliste für Enrico (zusätzlich zu V77–V133)

- Projektliste: zwei Knöpfe „Beispiel …“; Logistik-Center anlegen, alle Kapitel durchsehen; ⚙ entfernt je Beispiel nur das eigene.
- **ColorGentlemen einmal entfernen und neu anlegen**, damit das Umfeld-Portfolio die Stakeholder zeigt.
- Formular-Blätter: nichts ragt über den Rand, Text bricht um, Kästchen klar erkennbar, Knöpfe flach.
- Projektliste: Räder „Projekt“ und „Ansicht“ vorn auf einer Höhe; beim Scrollen bleibt die Zeile oben.
- Stakeholder-Portfolio und Meilenstein-Trendanalyse; Gantt beim Scrollen; Risiken/Änderungen auf voller Breite.

## Kleine Punkte (neu in V134)

- Sachliche Umfeldfaktoren (SF-…) stehen als Stakeholder mit Umfeld „sachlich“ auch in der Stakeholderanalyse (ohne Einstellung/Macht) – ggf. dort ausblenden.
- Umfeld-Portfolio: Spalten „sachlich | sozial“; im Logistik-Report umgekehrt (sozial links) – beim F-234-Bau an Enricos Report ausrichten.
- Feste Spaltenaufteilung: sehr breite Tabellen (5 Chancen und Risiken, 16 Spalten) bleiben eng; Spaltengewichte ggf. je Formular feiner einstellen.
- Gantt, PSP u. a. öffnen Notizen weiter im Pad (Netzplan schon im Kartenfenster).

### Ältere offene Punkte

Unverändert in `V133_Uebergabe_E-Sources.md`, `V132_…`, `V131_…`.

## Commit-Text V134 (e-sources)

**Summary:** `V134: Zweites Beispielprojekt Logistik-Center (F-233), Formular-Blätter passen in die Breite, Portfolio und MTA neu`

**Description:**
```
- F-233: Beispielprojekt „FUTURE-P.ROOF – smarter logistics“ aus dem zweiten ICB4-Report (sampleLogistics.ts) – Steckbrief, Ziele, Konflikte, Abnahmekriterien, Umfeld mit sachlichen Faktoren, Stakeholder, Risiken/Chance, Rollen mit AKV, DKI-Matrix, Phasen, 39 Vorgänge mit Einsätzen und Sachkosten, Beschaffungen, AP-Beschreibung und Statusbericht, Änderungen, Lessons Learned; kritischer Pfad wie im Report
- Beispiele verallgemeinert (samples.ts): je Beispiel ein Knopf in Projektliste und ⚙, Aktion sampleProject mit Kennung, removeSampleBy, parsePreds mit Präfix; Tests workspace +2
- Formular-Blätter: feste Spaltenaufteilung nach Spaltenart, Umbruch, Zahlen linksbündig, Papier-Optik für Felder, Kästchen und Knöpfe – alle Kapitel ohne Überstand
- Stakeholder-Portfolio mit Quadranten und Legende, Meilenstein-Trendanalyse als klassisches Dreieck; ColorGentlemen-Stakeholder im Umfeld „sozial“
- Gantt: Balken unter der festen Zeitleiste; Risiken und Änderungen über die ganze Breite
- Projektliste: Umschalt-Räder „Projekt“ und „Ansicht“ ganz vorn nebeneinander, Liste bleibt beim Scrollen oben
- F-234 entschieden (fehlende Darstellungen als Kapitel-Blätter wie im Report); Handbuch V134, Lastenheft, APP_VERSION V134, Übergabe V134

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q3ReP3z34hcSH7kkDy
```
