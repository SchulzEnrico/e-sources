# Übergabe V133 → V134 E-Sources

Stand: 27.11.2026 · Chat V133 · Nächster Chat: **V134 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V134 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-233** (zweites Beispielprojekt, neu), **F-232** („Gebaut V132“, **„Gebaut V133“** = P9 Formulare als Blätter, „Nachtrag V132“ P11–P14, „Nebenbei V133 – Netzplan“) und **F-227** (Handbuch). **Erstes Paket V134: F-233 zweites Beispielprojekt „Logistik-Center“** (FUTURE-P.ROOF, FP-1) aus dem Report `docs/Arbeitspakete/Vorlagen/Report_Logistik-Center_FP-1.pdf` (Text daneben als `.txt`, nur lokal) einpflegen wie „ColorGentlemen“ (`workspace/sampleProject.ts`) – dafür Beispielprojekte verallgemeinern (Liste, je Knopf in der Projektliste, eigener Id-Präfix, Aktion `sampleProject` mit Kennung, Tests). **Den Namen der Verfasserin nicht übernehmen.** Danach im Entscheidungs-Doc **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn nachsehen, ob Enrico **P11–P14** beantwortet hat (Stand V133: unbeantwortet, Rev. 17; Export als Markdown zeigt die Spalte „Antwort Enrico“) – beantwortet → Lastenheft nachziehen und bauen (P13 Inhalt, P11 Farben, P12 Medien, P14 Summen). Dann Rest von P9 (Feedback und Entscheidungsvorlagen als Blatt), **K14 Eingang** (F-231: festes Sheet „Eingang“ als To-do-Liste, Schnellerfassung landet dort, V sortiert ein), F-230 F7. Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst – **bei Dokumenten: visuelle Anordnung wie im Report (F-232)** –, **Funktion vor Design**, NF-08, F-231. **Neu V133:** Kästchen zum Abhaken global graues Glas; Stil **„sunken“** (Klasse `.sunken`, eingesenkt) – wenn Enrico „sunken“ sagt, ist dieses Aussehen gemeint. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V133_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Prüfdateien (F9) erst ab 07.12. – bis dahin nicht danach suchen.** **Dashboards** zählen wie V127 über die Vermerke im Lastenheft (F-232 ◐, F-233 ○ neu). Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

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



## Was in V133 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: wie V132, `gpm` jetzt 45 (+1) – alle grün (**723**).

1. **F-232 P11–P14:** im Doc unbeantwortet (Rev. 17) – Enrico informiert, P9 vorgezogen.
2. **F-232 P9 Formulare als Blätter** (`ProjectForms.tsx`): jedes Formular auf einem Blatt wie im Report (`article.paper.paper--form`): Kopfzeile Formular [ICB4] rot · Projektname, Überschrift Kapitel + Name, Fußzeile „Formular: …“; Querformat ab 8 Spalten (`Fk.isWideForm`, auch im Bericht genutzt); Feldlisten (`fields`, `record`) als zweispaltige Tabelle Bezeichnung | Wert; Grafiken in `PRINT_COLORS`; Rad „Größe“ gemeinsam mit dem Steckbrief (`usePaperSize`, `PaperSizeWheel`, `paperZoom` aus `ProjectSheet.tsx`); Kapitel 2.1 zeigt das Steckbrief-Blatt selbst. CSS am Ende von App.css (`.paper--form …`, Auswahlfelder mit eigenem Pfeil). Im Browser geprüft: Earned Value (Querformat, passt in die Breite), Projektabschluss, Arbeitspaketbeschreibung, Steckbrief, Tab-Reihenfolge.
3. **Kästchen zum Abhaken global graues Glas** (Enrico 11:08): alle `input[type=checkbox]` und `kcard__done` – Glanz oben, Lichtkante, helles Häkchen, Akzentring bei Hover/Fokus, bei erzwungenen Farben System-Kästchen.
4. **Netzplan** (Enrico 11:10–11:15, `ProjectNetwork.tsx`): Kästen 210 × 112, Ton der Kanban-Karten (Neumorph), alles lesbar; Klick/Leertaste zeigt die **Vorgangskarte** `#nw-pop` neben dem Kasten im Vordergrund, Stil **„sunken“**; Pfeile nehmen sie mit, Esc/✕ schließt. Lage nach dem **sichtbaren Ausschnitt** (`boxRef`: rechts, sonst links, sonst darunter, eingeklemmt) und nach dem Öffnen ins Bild gerollt (Enrico 11:16 „läuft aus dem Bild, wenn man am Rand etwas öffnet“). Im Browser geprüft. **„Notiz öffnen“** (Enrico 11:17/11:18: ging im Notizen-Modus auf – „Das sollte natürlich in der gleichen Ansicht aufgehen“): Knopf, Enter und Doppelklick öffnen die Notiz jetzt im **Kartenfenster** (`CardWindow` aus `SheetViews.tsx`, `sheetId` leer) direkt über dem Netzplan; Esc führt zum Kasten zurück. Im Browser geprüft. Gantt, PSP u. a. öffnen weiter per `openNote` im Pad – bei Bedarf ebenso umstellen.
5. **Zweites Beispielprojekt** (Enrico 11:11, PDF 35 Seiten): abgelegt unter `docs/Arbeitspakete/Vorlagen/` (gitignore), Lastenheft **F-233** angelegt – Bau V134.
6. Handbuch V133 (7, 7.1, 12, Änderungsverzeichnis), Lastenheft F-232/F-233, `APP_VERSION = 'V133'`.

## Nächste Schritte

1. F-233 zweites Beispielprojekt.
2. F-232 P11–P14 (nach Antwort), Rest P9 (Feedback, Entscheidungsvorlagen als Blatt).
3. K14 Eingang, F-230 F7.
4. **Prüfliste für Enrico** (alles aus V77–V132 plus):
   - Projekt-Modus › Formulare: jedes Kapitel als Blatt wie im Report; Arbeitspakete/Earned Value im Querformat; Rad „Größe“ wirkt auch im Steckbrief; Kapitel 2.1 = Steckbrief-Blatt.
   - Kästchen zum Abhaken überall graues Glas (Formulare › Felder, Kartenfenster-Checklisten, Einstellungen); Erledigt-Kreis der Karten.
   - Netzplan: Kästen lesbar und im Kartenton; Klick zeigt die eingesenkte Vorgangskarte vorn (auch am Rand ganz im Bild); Pfeile, Esc; „Notiz öffnen“/Enter/Doppelklick öffnet das Kartenfenster im Netzplan.

## Kleine Punkte (neu in V133)

- Kapitel 2.1 zeigt das Steckbrief-Blatt: eigene Felder aus „Felder“ für 2.1 erscheinen dort nicht; „n Pflichtfelder offen“ zählt weiter die Formularfelder.
- Formular-Blatt: Aktionsspalte (↑ ↓ 🗑) steht rechts im Blatt ohne Rahmen – im Druck/Bericht nicht vorhanden.
- Blatt-Kopfzeile zeigt kein Logo (P10/P12 offen).
- Vorgangskarte im Netzplan wiederholt die Angaben der Leiste unter dem Netzplan (Leiste bleibt für Bildschirmleser).
- Stil „sunken“ bisher nur an der Vorgangskarte.

### Ältere offene Punkte

Unverändert in `V132_Uebergabe_E-Sources.md`, `V131_…`, `V130_…`.

## Commit-Text V133 (e-sources)

**Summary:** `V133: Formulare als Blätter wie im Report (F-232 P9), Kästchen in grauem Glas, Netzplan lesbar mit Vorgangskarte`

**Description:**
```
- F-232 P9: jedes Formular als Blatt wie im Report – Kopfzeile, Hoch-/Querformat (isWideForm, auch im Bericht), Feldlisten zweispaltig, Grafiken in Druckfarben, gemeinsames Rad „Größe“ (usePaperSize), Kapitel 2.1 zeigt das Steckbrief-Blatt; Test gpm
- Kästchen zum Abhaken und Erledigt-Kreis der Karten global in grauem Glas
- Netzplan: Kästen grau neumorph im Ton der Kanban-Karten, größer und lesbar; Klick/Leertaste zeigt die Vorgangskarte im Vordergrund im neuen Stil „sunken“, Lage nach sichtbarem Ausschnitt; Notiz öffnet im Kartenfenster in derselben Ansicht
- F-233 angelegt: zweites Beispielprojekt „Logistik-Center“ (Bau V134)
- Handbuch V133, Lastenheft F-232/F-233, APP_VERSION V133, Übergabe V133

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q78zdF8CrEtdY6B2ms
```
