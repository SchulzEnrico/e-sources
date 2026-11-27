# Übergabe V131 → V132 E-Sources

Stand: 27.11.2026 · Chat V131 · Nächster Chat: **V132 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V132 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V128“ = K10 Butler B1–B9, „Gebaut V129“ = K10a, „Gebaut V130“ = K10b, **„Gebaut V131“** = K10c Zeitplan/Fälligkeit/wiederkehrend), **F-218** (Verweise V129–V131) und **F-227** (Handbuch). Entscheidungs-Doc **K10** https://claude.ai/artifact/Q3XCPgmGiUY6kgnANv4c29 (PDF `docs/Arbeitspakete/F-231_V128_K10_Butler.pdf`, Text mit `pdftotext -layout` – Ziel in `$HOME`, nicht `/tmp`). **Nächstes Paket: K10d Beobachten (B8):** Auge-Knopf „Beobachten“ an Karte, Spalte und Board (je Person); bringt der Gist-Abgleich eine Änderung von jemand anderem an etwas Beobachtetem, entsteht ein Eintrag unter einer Glocke **„Neuigkeiten“** im Cockpit-Kopf, auf Wunsch mit Systemmitteilung (Schalter A8); @-Erwähnungen (offen seit V122) melden dort mit; keine E-Mail ohne Server. Abgleich ist heute „ganzer Stand, neuerer gewinnt“ (`useGistSync.ts`, Aktion `remote`) – der Unterschied alter/neuer Stand ergibt die Neuigkeiten (Spur-Einträge mit `by` ≠ ich). Danach K14 Eingang, F-230 F7. Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V131_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** **Dashboards** zählen Anforderungen wie Dashboard V127 über die Vermerke der F-/NF-Einträge im Lastenheft (F-231 bleibt ◐; Vermerk jetzt „… K10a V129, K10b V130, K10c V131“). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230). **Neu (Wunsch Enrico V131):** Am Ende jedes Chats nach dem Übergabe-Begrüßungstext den **Projektstand** als gegliederten Textbaustein ausgeben (Daten wie die obere Reihe im Dashboard V127: fertig/teilweise/offen von n Einträgen, Chats, Commits, Zeilen und Bauteile, Tests, Touren · Hilfe-Einträge, Entscheidungs-Docs).

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: schedule**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments kanbanTimeline covers cardFields columnLook mirrors stars ruleKit buttons schedule}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
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



## Was in V131 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 10, projectKanban 3, kanbanMore 13, checklists 3, tags 9, kanbanViews 5, comments 3, kanbanTimeline 6, covers 6, cardFields 9, columnLook 5, mirrors 6, stars 4, ruleKit 9, buttons 4, **schedule 6** – alle grün (718).

1. **K10c Auslöser** in `workspace/ruleKit.ts`: `daily`, `workdays`, `weekly` (`n` = Wochentag 1–7), `monthly` (`n` = Tag 1–31), je `b` = Uhrzeit „HH:MM“ oder leer; `dueNear` (`a` = before|after, `n` = Anzahl, `b` = d|h). Neue Zahlarten `NumKind` (`days`, `wday`, `mday`, `num`) mit Prüfung in `partOk`/`cleanPart`; `SCHEDULE_TRIGS`, `isSchedule`, `isTimed`, `REL_CHOICES`, `UNIT_CHOICES`; `Spec` exportiert. Neue Aktion **`fromTpl`** (`a` = Id der Kartenvorlage, `b` = Spalte, leer = erste).
2. **Rechnen** `workspace/ruleTime.ts` (rein): `momentOf`, `stampOf`, `onDay` (Arbeitstage über `isOffDay` des gemeinsamen Arbeitskalenders), `lastOccurrence`/`nextOccurrence`, `dueMoment`, `dueStamp`, `ranKey`, `recurId` (Regel~Termin), `arm`/`armIfNeeded` (scharf stellen beim Speichern/Einschalten), `pruneRan`.
3. **Ausführung** `workspace/ruleRun.ts`: `runActs` (nach `fromTpl` gelten die folgenden Aktionen der neuen Karte; feste Kennung; gibt es sie schon → nichts), `act` mit Tag der Wiederholung (`day`, auch für {heute}; `fill` heißt jetzt `fillText`), `runTimed` in `runCheck(ws, now, { checks, timed })`: Zeitplan einmal je neuer Wiederholung (nur die letzte), Aktionen vor `fromTpl` auf jede passende Karte im Geltungsbereich, ab `fromTpl` die neue Karte; Fälligkeit je Karte einmal je Termin. Stand in **`ruleSet.ran`** (`ruleSet.ts`: Feld, `withRan`, `RAN_MAX`, Lesen in `parseRuleSet`; Dateiformat bleibt 13). Bericht `RuleRun.made`/`late`, `KIT_TEXT.ran(…, made, late)` („1 wiederkehrende Karte angelegt (1 nachgeholt)“). Nur der Stand geändert → neuer `ws` ohne Bericht (speichern, nichts melden).
4. **Reducer/App**: `kitSave`/`kitOn` stellen scharf (`RT.armIfNeeded`); `ruleSweep` mit `checks`/`timed`; App: erster Lauf nach 30 s (beides), „regelmäßig“ stündlich, Uhr-Regeln alle 5 Minuten; dispatch, sobald sich der Stand ändert.
5. **Oberfläche** `components/RuleKit.tsx`: Eingaben Wochentag (Auswahl), Tag im Monat, Anzahl, Uhrzeit (`type=time`), vor/nach, Tage/Stunden (Fälligkeit liest sich „[1] [Tage] [vor] „fällig““), Kartenvorlage (Auswahl, sonst Hinweis); Hinweis unter dem Auslöser bei Uhr-Regeln; „Nächster Termin: Mo., 30.11.2026, 09:00 Uhr“ hinter dem Satz; Begriff „Zeitplan“ in der Begriffsliste. Satz `ruleText.ts`: Zeitplan als Satzanfang („Jeden Montag um 09:00 Uhr: …“, mit Bedingungen „für jede Karte, für die gilt: … –“), „bei der neuen Karte …“ nach `fromTpl`. CSS `.rkit__in--time`, `.rkit__none`, `.rkit__hint`, `.rkit__next`.
6. **Behoben (Meldungen Enrico im Chat):** (a) Menüs aus einer aufgeklappten Kopfleiste (z. B. „+ Sheet“, ⋮ im Pad-Kopf) lagen unter dem Pad – `.ovf-top` hebt das Pad auf 1190, die Leiste auf 1200, Menüs lagen auf 1000; jetzt `.menu__list--float`, `.menu__list--toolbar`, `.tooltip` auf 1250. Im Browser geprüft: „+ Sheet“ › To-do-Liste legt das Sheet an. (b) Aufgeklappter Pad-Kopf flackerte: der `MutationObserver` in `Overflow.tsx` setzte bei jeder Änderung – auch am eigenen Zähler im „»“ – die gemerkte Überlauf-Breite zurück; an der Breiten-Kante kippte die Leiste so endlos. Änderungen in `.ovf__knob`/`.ovf-ph` zählen jetzt nicht. Enrico: danach ruhig. (c) Menüs öffneten oben links: klappte die Leiste zu, während ihr Menü offen war, hatte der Knopf keine Lage mehr (`Menu.fit` rechnete mit 0,0). Jetzt hält ein offenes Menü die Leiste offen (`data-menu-open` an `.menu`, `busy` in `Overflow.tsx`), und `fit` behält die Lage, solange der Knopf nicht zu sehen ist. Im Browser geprüft: ⋮ aus dem aufgeklappten Pad-Kopf öffnet rechtsbündig unter dem Knopf und bleibt dort. (d) Schwebende Kopfleiste eines Pads rechts (Notizen-Modus, drei Spalten) erschien bei Enrico ganz links: Lage jetzt in zwei Schritten (an die alte Stelle legen, echten Versatz und echte Breite messen, einpassen; noch einmal im nächsten Bild) – `place` im Lage-Effekt von `Overflow.tsx`. Im Test (2 × 2, 1000 px) liegen die Leisten richtig; Enricos Aufbau mit drei Spalten war im Test nicht nachzustellen – **in der Prüfliste**. (e) Nach Enricos Bildschirmaufnahme: aufgeklappte Leiste lag teils hinter dem Nachbar-Pad – jetzt hebt `Overflow.tsx` beim Aufklappen **jeden positionierten Vorfahren** an (`.ovf-top`, bisher nur solche mit eigenem z-index). (f) Schalter „»“ im Pad-Kopf sprang beim Aufklappen, weil rechts von ihm der Vollbild-Knopf auftauchte – „»“ steht jetzt direkt vor ✕ (`Pad.tsx`). (g) Design (Enrico): Kartenfenster (`.cardwin__box`) und offene Notiz im Pad (`.pad .nblock__main > .note`) im Ton des gewählten Notiz-Chips (Akzent 22–36 %), das Kartenfenster deckend über dem Pad-Hintergrund (Ende `App.css`); ebenso Speicher-Leiste (`.note__actions`, deckend) und Schreibfeld (`.nedit`, `textarea`); alle Knöpfe dort (außer Umschalt-Rädern und „»“; das ✕ des Kartenfensters rund, Enrico: „grau und rund“) als heller Neumorph-Chip wie „Neue Notiz“ (Enrico: „Und Buttons“, „die keine Scrollräder sind, müssen auch in Grau neumorph gehalten sein“). Nur im Testmodus mit roter Akzentfarbe angesehen – Enricos Grau prüfen; helle Themen nicht geprüft.
7. Klein: Hilfe und Begriff `kitSchedule` (Symbol `recent`), Handbuch V131 (Kapitel 5, Änderungsverzeichnis), Lastenheft F-231 „Gebaut V131“ + Vermerk, F-218 Verweis, `APP_VERSION = 'V131'`.

**Im Browser geprüft (V131):** Projekt + Kanban (Alpha) im Testmodus; „Automatisierung“ › „Neue Regel“: Auslöser „Zeitplan: jede Woche am …“ zeigt Wochentag und Uhrzeit, Hinweistext; Aktion „Karte aus Vorlage anlegen“ ohne Vorlage zeigt den Hinweis; gespeichert „Jeden Montag um 09:00 Uhr: die Meldung „Wochenstart!“ zeigen. Nächster Termin: Mo., 30.11.2026, 09:00 Uhr“; Fälligkeit „Wenn eine Karte in 1 Tag fällig wird, dann als dringend markieren.“; keine Fehler. **Nicht im Browser geprüft:** echtes Auslösen nach der Uhr (nur Unit-Test), wiederkehrende Karte mit Vorlage, Meldung „nachgeholt“ beim Start.

## Nächste Schritte

1. **K10d** Beobachten (Startanweisung), dann K14, F-230 F7.
2. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
3. **Prüfliste für Enrico** (alles aus V77–V130 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `schedule.test.ts`).
   - Pad-Kopf schmal ziehen, „»“ öffnen: Leiste ruhig; „+ Sheet“ und ⋮ öffnen ihr Menü sichtbar über dem Pad; auch bei zwei, drei Pads nebeneinander (Notizen-Modus) öffnet ⋮ das Menü des richtigen Pads.
   - Eine Karte im Board „Als Kartenvorlage“ setzen (z. B. „Wochenbericht“).
   - „Automatisierung“ › „Neue Regel“: „Zeitplan: jeden Tag“, Uhrzeit in 2–3 Minuten, Aktion „Karte aus Vorlage anlegen“ (Wochenbericht, Spalte leer), dann „Tag setzen“ → Satz „Jeden Tag um … Uhr: eine Karte aus der Vorlage „Wochenbericht“ in der ersten Spalte anlegen und bei der neuen Karte den Tag … setzen.“, „Nächster Termin“ stimmt.
   - Bis zu 5 Minuten nach der Uhrzeit: neue Karte in der ersten Spalte mit Tag, Meldung „… 1 wiederkehrende Karte angelegt.“ mit „Rückgängig“; Spur der Karte nennt die Regel. Vorlage unverändert.
   - E-Sources schließen, Uhrzeit der Regel verstreichen lassen, neu öffnen → nach ~30 s „(1 nachgeholt)“, nur eine Karte.
   - Regel „Fälligkeit: 1 Tage vor „fällig““ + „als dringend markieren“; Karte „fällig“ morgen mit Uhrzeit in wenigen Minuten (bzw. heute) → wird dringend, nur einmal.
   - „Zeitplan: jede Woche am Freitag“ mit Bedingung „liegt in Spalte Erledigt“ + „archivieren“ → Satz „Jeden Freitag: für jede Karte, für die gilt: … – archivieren.“
   - Zweites Gerät (Abgleich): keine doppelte wiederkehrende Karte.

## Kleine Punkte (neu in V131)

- Zeitplan kennt kein „alle n Wochen“ und kein „letzter Werktag im Monat“ (Trello: „every N weeks“, „on the last working day“) – bei Bedarf als weitere Zeitplan-Arten.
- Uhr-Regeln laufen alle 5 Minuten – bis zu 5 Minuten Verzug zur Uhrzeit.
- „An Arbeitstagen“ nutzt den gemeinsamen Arbeitskalender, nicht den eigenen Kalender eines Projekts (`calendarFor`).
- Wiederkehrende Karte übernimmt „fällig“ der Vorlage, wenn diese eins hat – im Satz besser „fällig setzen“ danach.
- Fehlt die Kartenvorlage (gelöscht/archiviert), legt die Regel still nichts an; der Satz zeigt „?“. Hinweis in der Liste wäre klein.
- Fälligkeits-Regeln: auf zwei Geräten ohne Abgleich dazwischen kann eine Aktion doppelt laufen (z. B. Kommentar); Karten nicht (feste Kennung).
- Bedingungen gelten bei Zeitplan-Regeln nur für die Aktionen vor „Karte aus Vorlage“ – im Hinweis erklärt.
- Regel bearbeiten ohne Änderung am Auslöser stellt nicht neu scharf (gewollt); Auslöser ändern zählt ab dann.
- Kein Tour-Schritt (wie K1–K12, K10a/b).
- Trello: Butler-Kalender- und Fälligkeitsbefehle stehen nicht im Board-JSON – Import/Export unverändert (Prüfung mit F9 ab 07.12.).
- Flackern im Pad-Kopf: Ursache war die Mess-Schleife über den Zähler; tritt es wieder auf, `Overflow.tsx` `measure` (spill vs. need) an der Kante prüfen.

### Ältere offene Punkte

Unverändert in `V130_Uebergabe_E-Sources.md` („Kleine Punkte (neu in V130)“ und „Aus V123–V129 weiter offen“); erledigt davon in V131: keiner. Der V128-Punkt „Pad-Optionen ⋮ aus dem Überlauf liegt unter dem Pad“ ist mit V131 6(a) behoben.

## Commit-Text V131 (e-sources)

**Summary:** `V131: Kanban wie Trello – Zeitplan, Fälligkeit, wiederkehrende Karten (K10c)`

**Description:**
```
- F-231 K10c: Zeitplan-Regeln (jeden Tag, Arbeitstage nach Arbeitskalender, Wochentag, Monatstag, mit Uhrzeit) und Fälligkeits-Regeln (n Tage/Stunden vor oder nach „fällig“) im Regel-Baukasten
- Wiederkehrende Karten: Aktion „Karte aus Vorlage anlegen“, je Termin eine neue Karte mit fester Kennung Regel~Termin, Folgeaktionen gelten der neuen Karte (auch in Regeln und Knöpfen)
- Verpasste Termine beim Start einmal nachholen (nur die letzte), Stand in ruleSet.ran (abgeglichen), scharf ab Speichern/Einschalten; Prüfung nach 30 s und alle 5 Minuten
- workspace/ruleTime.ts, runTimed in runCheck, Sätze „Jeden Montag um 09:00 Uhr: …“, „Nächster Termin“ in der Liste
- Behoben: Menüs aus aufgeklappter Kopfleiste lagen unter dem Pad (+ Sheet, ⋮) bzw. sprangen nach oben links; Pad-Kopf flackerte an der Breiten-Kante (Overflow-Messung); aufgeklappte Leiste rutschte hinter Nachbar-Pads; Schalter „»“ sprang
- Design: Kartenfenster und offene Notiz samt Speicher-Leiste, Schreibfeld und Knöpfen im Grau des Notiz-Chips, Knöpfe neumorph
- Hilfe und Begriff kitSchedule, Handbuch V131, Lastenheft F-231 „Gebaut V131“, Tests schedule (6), APP_VERSION V131, Übergabe V131

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q4XQftLpf6xmoCcVqv
```
