# Übergabe V135 → V136 E-Sources

Stand: 27.11.2026 · Chat V135 · Nächster Chat: **V136 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V136 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-235** (neu, entschieden inkl. L2-Änderung und L7), **F-234** („Gebaut V135“, „Abgleich ColorGentlemen V135“, „Nachtrag V135“), **F-232** (P11–P14 weiter offen) und **F-227** (Handbuch). **Erstes Paket V136: F-235 fertig bauen** – (1) Schreibschutz für das Live-Projekt in der Online-Demo, **zentral in der Verarbeitung** (jede Aktion, die Projekt `pj-es` oder Notizen `es-n-…` ändert, wird im Reducer abgewiesen, wenn nicht `import.meta.env.DEV`; Hinweis am Ort „Live-Projekt – nur zum Ansehen“; Besucher dürfen eine Kopie anlegen), das Live-Projekt in der Demo automatisch anzeigen bzw. per Knopf anlegen; (2) **L7**: Basisplan = ursprünglicher Umfang, später dazugekommene Bereiche (z. B. Notizen F-206, Projekt-Modus F-226, Beispielprojekte, Retro-Designs) als Änderungen in Kapitel 13 mit Datum, Anlass, Auswirkung auf Ziele/Aufwand/Termin; Texte erzählen, **wie aus einer kleinen Vision eine bessere Version von allem wurde** (Enrico 12:18). Daten in `tools/live_project.py` mit erzeugen (Datum je F-Punkt aus dem Lastenheft). **Danach F-234 Rest:** neue Formulare AP-Statusbericht (je AP, eingefroren), Teamrollen (Belbin), Eisenhower (aus wichtig/dringend), Nachrichtenquadrat, Maßnahmenplan/Moderation, Anlagen – im Aussehen des ColorGentlemen-Reports; beide Beispiele (nur noch ColorGentlemen + Live-Projekt) füllen; D3 „Anordnung von Hand verschiebbar“. Dann F-232 P11–P14 (wenn beantwortet), Rest P9, K14 Eingang, F-230 F7. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>` (Live-Projekt aktualisieren). Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **bei Dokumenten Aussehen wie im Report**, **Funktion vor Design**, **Retro-Designs: alle Bedienelemente im Stil des Systems, nur die Umschalt-Räder bleiben gleich**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V135_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Prüfdateien (F9) erst ab 07.12.** **Dashboards** zählen wie V127 über die Vermerke im Lastenheft (F-234 ◐, F-235 ◐ neu). Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

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

Tests V135: **728** grün (`gpm` 48, `workspace` 528).

**Neue Dateien anlegen:** direkt im Repo mit `device_bash` (`cat > … <<'EOF'`), Änderungen an bestehenden Dateien per `device_bash` + Python (`str.replace` mit `assert`). `device_commit_files` legte mehrmals die vorige Fassung ab (V123, V125) – meiden. **`npx tsc --noEmit -p .` braucht bis ~170 s** – mit `timeout 170` und `timeout_ms: 180000` aufrufen, sonst bricht der Aufruf ab.

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl`. **Kleine Ausgabe beim Öffnen:** `browser.tabs.create("http://localhost:2910/package.json")`, dann `browser.show()` und `tab.page.setViewportSize({ width: 1400, height: 900 })`, dann `tab.page.goto("http://localhost:2910/?test=voll")`. **Die Begrüßung oben rechts fängt Klicks ab** – in V123 blieb sie teils stehen (Fokus/Zeiger darin hält sie an): `section.greeting` › Knopf „Begrüßung schließen“ klicken oder warten. Im Testmodus: Knopf „Projekt“ (Text `^\s*Projekt$`, der letzte) → Name tippen (Feld hat den Fokus), Enter → „Kanban-Board anlegen“ → `[data-add]` klicken, Titel tippen, Enter, Esc. Termine am schnellsten über Rad „Ansicht“ › Tabelle (`.ktab input[type=date]` mit `fill`). **Rad-Wechsel brauchen ~0,7 s** je Raste (`ArrowDown` am `slider` „Ansicht“, dann warten, dann nächste Raste). Jeder Hot Reload löscht die Testdaten. Ziehen der Zeitleisten-Balken geht mit `tab.drag` in Bildpunkten (vorher `tab.screenshot()`, Bild ist halb so breit wie 1400); HTML5-Ziehen (Kalender, „Ohne Datum“) mit `DragEvent` + `DataTransfer` per `page.evaluate`.

**Browser-Hinweise (V124–V134):** unverändert in `V134_Uebergabe_E-Sources.md`.

**Browser-Hinweise (V135):** Retro-Design im Test ohne Speichern: `page.evaluate(() => document.documentElement.dataset.theme = 'win2000')` (zurück: `'dark'`); nur CSS-Änderungen behalten die Testdaten, Änderungen an `.ts`-Modulen meist auch. Live-Projekt: Knopf `getByRole('button', { name: /Live-Projekt E-Sources/ })` in der Projektliste (nur beim Entwickeln). Netzplan-Zoom: `getByRole('slider', { name: /^Zoom/ })`, Home = „Ganz“; Doppelklick mit `tab.click(x, y, { clickCount: 2 })` (Bildpunkte der Aufnahme 706 × 454), danach hat `.nw__box` den Fokus, Esc = ganz. Kapitel-Rad über die Grafik-Blätter: je Raste ~0,65 s – ein Skript schafft nur ~3 Wechsel plus Bildschirmfotos (45 s). Prüfskript für Überstand auf den Blättern:

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

## Was in V135 passiert ist

`npx tsc --noEmit -p .` sauber. Tests **728** grün (+3).

1. **F-234 Doc:** Antworten D1–D8 eingetragen („Wie Vorschlag – Aussehen wie im eigenen Report (11:45)“), Entscheidungszeile, PDF erneuert.
2. **F-234 Grafik-Blätter gebaut** (`workspace/gpmFigures.ts`, Layout `figure`): Zielhierarchie, Organigramm, Phasenplan, PSP, Balkenplan mit kritischem Pfad (Querformat), Auslastungsdiagramm (Rad „Ressource“) – alle im Browser geprüft, im Bericht als „Abbildung: …“; Klick öffnet die bedienbare Ansicht (`openView` von `ProjectCockpit`).
3. **ColorGentlemen abgeglichen:** Termin-/Kostenziele T1–T6, K1–K6 (Abb. 4), DKI-Matrix 12 Zeilen (Abb. 8), 2 Lessons Learned (Kap. 10.2, 14.1).
4. **Retro-Designs (Enrico 11:57):** moderne Glas-/Neumorph-Knöpfe und Rundungen nur noch in Dunkel/Hell; in allen 13 Retro-Designs die Knöpfe des Systems (per Skript geprüft: keine dunklen Knöpfe mehr auf hellen Retro-Flächen); Räder bleiben. Kästchen sichtbar (12:03), Blatt-Felder immer Papier (12:06). Zwischenfehler „Netzplan-Kästen als Pillen“ (12:00) sofort behoben.
5. **Netzplan-Zoom (12:01/12:02):** Rad „Zoom“ mit „Ganz“, Doppelklick → 100 % an der Stelle, Esc → ganz. Geprüft.
6. **F-235 Live-Projekt** (Doc https://claude.ai/artifact/Fjpf3JskCv8GU39WszCS5f, entschieden 12:12, L2 geändert, L7 12:18): Generator `tools/live_project.py` → `liveProjectData.ts` (159 F-Punkte: 123 fertig, 25 teilweise, 11 offen), `liveProject.ts`, Knopf in der Projektliste (nur Entwickeln). Im Browser geprüft (PSP, 58 %).
7. **Demo:** nur ColorGentlemen; Logistik-Center `retired` (Enrico 12:16), im ⚙ nur noch entfernbar. `sampleLogistics.ts` bleibt im Repo (Löschen braucht Freigabe).
8. Handbuch V135 (7, 7.1, Netzplan, Änderungsverzeichnis), Lastenheft F-234/F-235, `APP_VERSION = 'V135'`.

## Prüfliste für Enrico (zusätzlich zu V77–V134)

- Formulare › Kapitel 2.2 Zielhierarchie, 6.1 Organigramm, 7 Phasenplan (Grafik), 8 PSP, 9 Balkenplan, 10 Auslastungsdiagramm – Aussehen wie im Report? Klick öffnet PSP/Gantt/Ressourcen; Bericht zeigt die Abbildungen.
- **ColorGentlemen entfernen und neu anlegen** (neue Ziele T/K, DKI-Matrix, Lessons Learned).
- Retro-Designs durchschalten: Knöpfe, Kästchen, Felder passend; Räder gleich; Netzplan-Kästen eckig.
- Netzplan: Zoom „Ganz“, Doppelklick, Esc.
- Projektliste: „Live-Projekt E-Sources“ anlegen, später „aktualisieren“ – eigene Notiz am Projekt bleibt.

## Kleine Punkte (neu in V135)

- Zielhierarchie: Legende steht unten rechts – im Report links neben dem Baum; bei vielen Spalten wird der Baum sehr breit (ggf. zweite Reihe).
- Organigramm: externe Rollen gestrichelt wie in Abb. 7 (Angabe „extern“ an der Rolle fehlt im Datenmodell).
- Balkenplan: Pfeile einfach rechtwinklig; bei vielen Vorgängen hohe Grafik (ggf. auf mehrere Blätter teilen).
- Auslastung: Wochenbalken; Report zeigt Monate mit Treppenlinie – Rad „Woche/Monat“ denkbar.
- Kopfleiste bei 1400 px: „Diese Woche … von 40 h“ wird gequetscht (schon vorher so).
- `sampleLogistics.ts` und die Logistik-Tests später löschen (Freigabe zum Löschen nötig).

### Ältere offene Punkte

Unverändert in `V134_Uebergabe_E-Sources.md`, `V133_…`, `V132_…`, `V131_…`.

## Commit-Text V135 (e-sources)

**Summary:** `V135: Grafik-Blätter wie im Report (F-234), Live-Projekt E-Sources (F-235), Retro-Designs mit System-Knöpfen, Netzplan-Zoom`

**Description:**
```
- F-234: Grafik-Blätter im Aussehen des ICB4-Reports (gpmFigures.ts, Layout figure) – Zielhierarchie, Organigramm, Phasenplan, PSP, Balkenplan mit kritischem Pfad, Auslastungsdiagramm; auch im Bericht; Klick öffnet die bedienbare Ansicht
- ColorGentlemen abgeglichen: Termin- und Kostenziele, DKI-Matrix wie Abb. 8, Lessons Learned
- F-235: Live-Projekt E-Sources – Generator tools/live_project.py aus dem Lastenheft, liveProject.ts, Knopf in der Projektliste (Entwickeln); Online-Demo nur mit ColorGentlemen, Logistik-Center entfernt
- Retro-Designs: Knöpfe, Rundungen, Kästchen und Felder im Stil des jeweiligen Systems, Umschalt-Räder bleiben; Blatt-Felder immer Papier
- Netzplan: Rad Zoom mit „Ganz“, Doppelklick rückt die Stelle in 100 % heran, Esc zeigt alles
- Tests +3 (728); Handbuch V135, Lastenheft F-234/F-235, APP_VERSION V135, Übergabe V135

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q4LGCfvfDPUhftkdH1
```
