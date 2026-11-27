# Übergabe V132 → V133 E-Sources

Stand: 27.11.2026 · Chat V132 · Nächster Chat: **V133 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V133 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-232** (Dokumente wie auf Papier: „Entschieden V132“, „Gebaut V132“, **„Nachtrag V132“** mit P11–P14), **F-231** („Gebaut V132“ = K10d Beobachten) und **F-227** (Handbuch). Entscheidungs-Doc **F-232** https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (PDF `docs/Arbeitspakete/F-232_V132_Dokumente_wie_Papier.pdf`) – **zuerst dort nachsehen, ob Enrico P11–P14 beantwortet hat** (Spalte „Antwort Enrico“; Docs-Werkzeug `read` mit `sinceRev` 17); beantwortet → Lastenheft F-232 nachziehen und bauen: P13 Inhaltsverzeichnis (Ansicht „Inhalt“ vorn im Rad, Seitenleiste neben jedem Blatt), P11 Farben je Projekt/Dokument, P12 Medien in mehrzeiligen Feldern und Logo, P14 weitere Summen; danach P9 die Formulare der Ansicht „Formulare“ in Report-Reihenfolge als Blätter (Vorlage `components/ProjectSheet.tsx`, Report `Projektmanagement_Report_-_Enrico_Schulz…pdf` – Enrico hat ihn in V132 hochgeladen, ggf. erneut anfordern). Danach **K14 Eingang** (F-231), F-230 F7. Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst – **bei Dokumenten: visuelle Anordnung wie im Report (F-232)** –, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V132_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Prüfdateien (F9) erst ab 07.12. – bis dahin nicht danach suchen.** **Dashboards** zählen wie V127 über die Vermerke im Lastenheft (F-231 ◐ „… K10c V131, K10d V132“; F-232 ◐ neu). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230). Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

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



## Was in V132 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: wie V131 plus **watch 4** – alle grün (**722**).

1. **Prüfung V131 (Enrico: zuerst prüfen):** aufgeklappte Pad-Kopfleiste bei **drei Spalten im Notizen-Modus** – im Browser (1400 × 900, drei Pads 688/340/340 px) liegen die Leisten des mittleren und des rechten Pads an der richtigen Stelle und vollständig **vor** dem Nachbar-Pad (Trefferprüfung über die ganze Leistenbreite). Enricos Grau/eigener Aufbau weiter in der Prüfliste.
2. **ColorGentlemen (Meldung Enrico „fehlt weiterhin“):** war nur im ⚙ versteckt – jetzt Knopf in der Projektliste (leer: groß; sonst „Beispiel „ColorGentlemen““ neben „+ Projekt“), legt an und wählt aus (`addSample` in `ProjectCockpit.tsx`, `SAMPLE_TEXT.short/hint/addedHere`).
3. **Projekt-Modus (Enrico):** Ansichten (Steckbrief, PSP, Gantt …) **auf ganzer Breite unter der Projektzeile** (CSS `.pj .pc__body` eine Spalte); die Tabelle zeigt nur das gewählte Projekt, **gewählt im Feld „Name“** (Knopf mit „n Projekte ▾“, Liste `.pj__pick` role listbox mit Unterprojekten und Zustand; Pfeile, Enter, Esc, Klick außerhalb; Pfeile auf dem Namen wechseln weiter direkt). Texte `PROJECTS_TEXT.namePick*` (Achtung: `pickHint` gab es dort schon).
4. **F-232 Dokumente wie auf Papier** – neu, Entscheidungs-Doc, **entschieden** (Enrico: „Halte dich an die visuellen Anordnungen im Report, und dann folgen wir deinen Vorschlägen“): Steckbrief als **Blatt** `components/ProjectSheet.tsx` wie Abbildung 3 (Details Lastenheft F-232 „Gebaut V132“). Daten `ProjectCharter.main/team/steering/vendors/others/signAg/signPl/fixed`, Aktion `charterEdit`; Steckbrief-Ansicht: Zeile „Stand“, Leiste „Verwaltung“ (`details.pj__admin`), Blatt; Kennzahlen-/Vorgangsliste entfernt; Beispielprojekt ergänzt (Oberziel jetzt nur „Errichtung und Inbetriebnahme einer neuen Betriebsstätte“). Kostensumme mit Budget-Abgleich (P14 vorgezogen). **Nachtrag Enrico (10:55):** Farben frei wählbar, Medien einfügen, übergeordnetes Inhaltsverzeichnis, gleiche Daten überall aktuell, Summen rechnen → Doc P11–P14, **Antwort offen**.
5. **K10d Beobachten** (`workspace/watch.ts`, `components/NewsBell.tsx`, `collectNews` in `useGistSync.ts`, Schalter A8 `newsSystem`, Taste W, Auge an Karte/Spalte, Board-Schalter, Glocke im Cockpit-Kopf) – Details Lastenheft F-231 „Gebaut V132“. Im Browser geprüft: W setzt Auge + Meldung mit Rückgängig, ⋮ „Spalte beobachten“ setzt Auge im Spaltenkopf, Board-Schalter, Glocke zeigt „nichts Neues“ bzw. (mit Testdaten im localStorage) zwei Einträge mit Zahl „2“; Klick öffnet die Karte (seitdem schließt das Cockpit – nicht mehr im Browser angesehen). **Nicht geprüft:** echter Abgleich zwischen zwei Geräten/Profilen, Systemmitteilung.
6. Hilfe und Begriff `kitWatch` (Symbol `bell`), Handbuch V132 (Kapitel 5 Beobachten, Kapitel 7 Projekt wählen und Steckbrief-Blatt, Änderungsverzeichnis), Lastenheft F-231/F-218/F-232, `APP_VERSION = 'V132'`.

## Nächste Schritte

1. F-232 P11–P14 (nach Enricos Antwort), dann P9 Formulare als Blätter.
2. K14 Eingang, F-230 F7.
3. **Prüfliste für Enrico** (alles aus V77–V131 plus):
   - Seite neu laden, `npm test` in `web/` (neu: `watch.test.ts`).
   - Notizen-Modus, drei Pads nebeneinander, Pad-Kopf aufklappen: Leiste liegt vor dem Nachbar-Pad, in deinem Grau.
   - Projekt-Modus: „Beispiel „ColorGentlemen““ anlegen; Name anklicken → Projektliste, wechseln mit Pfeilen/Enter; Steckbrief/PSP/Gantt auf ganzer Breite.
   - Steckbrief-Blatt: mit Abbildung 3 im Report vergleichen; Felder ändern (Meldung am Feld), „Meilensteine fixieren …“, Rad „Größe“, Leiste „Verwaltung“; Kostensumme und Budget-Abgleich (Budget kleiner machen → rot); Änderung im Formular „Projektauftrag“ erscheint im Blatt und umgekehrt.
   - Karte: W bzw. „Beobachten“ im Kartenfenster → Auge; Spalte ⋮ „Spalte beobachten“; Board „Beobachten“.
   - Zwei Geräte mit **verschiedenen Profilnamen** und Gist-Abgleich: auf Gerät B Karte ändern bzw. kommentieren bzw. „@Enrico“ schreiben → auf Gerät A nach dem Abgleich Glocke im Cockpit-Kopf mit Zahl; Eintrag öffnet die Karte; „Alle als gelesen“. A8 „Neuigkeiten: Mitteilung des Systems“ mit E-Sources im Hintergrund.

## Kleine Punkte (neu in V132)

- Beobachten je **Profilname**: wer den Namen ändert, verliert seine Beobachtungen (alte Einträge tragen den alten Namen). Gleicher Name auf zwei Geräten = dieselbe Person (gewollt: eigene Änderungen melden nicht).
- Karte, die nur in eine beobachtete Spalte verschoben wird, ohne Spur-Eintrag mit Namen, meldet nicht (Verschieben schreibt keinen Spur-Eintrag mit `by`) – bei Bedarf Spur-Eintrag „moved“ beim Spaltenwechsel.
- Neuigkeiten kommen nur aus dem Gist-Abgleich (`pull`), nicht aus einem zweiten Fenster auf demselben Gerät.
- Kartenfenster „Beobachten“: Rückmeldung nur über den Knopf (Text „Beobachtet“) und den Bildschirmleser, keine eigene Meldezeile.
- Glocke nur im Cockpit-Kopf (wie entschieden); ein Hinweis auf ungelesene Neuigkeiten an der Fokusanzeige wäre klein.
- Steckbrief-Blatt: „AG extern“/„AG intern“ teilen sich `client`/`clientKind` – Eintrag in einem Feld leert das andere; Anschrift wird beim Bearbeiten in `client` zusammengeführt.
- Blatt-Datumsfelder speichern sofort bei jeder Änderung (nicht erst beim Verlassen).
- Projektleiter/in nur lesend (Instanz „Projektleitung“ unter „Verwaltung“).
- Ohne Profilnamen zeigt „Projektleiter/in“ „Ich“.
- Kein Tour-Schritt für Beobachten und Blatt.

### Ältere offene Punkte

Unverändert in `V131_Uebergabe_E-Sources.md` und `V130_…`; erledigt davon in V132: „Bei mir zuerst prüfen“ (drei Spalten) im Test bestätigt.

## Commit-Text V132 (e-sources)

**Summary:** `V132: Beobachten und Neuigkeiten (K10d), Steckbrief als Blatt wie im Report (F-232)`

**Description:**
```
- F-231 K10d: Karte (Taste W, Kartenfenster), Spalte (⋮) und Board beobachten, Auge als Kennzeichen; Glocke „Neuigkeiten“ im Cockpit-Kopf aus dem Gist-Abgleich (Änderungen anderer, neue Karten, @-Erwähnungen), Schalter A8 „Neuigkeiten: Mitteilung des Systems“
- workspace/watch.ts, components/NewsBell.tsx, collectNews in useGistSync, Felder watch an Notiz, Spalte und Board, Tests watch (4)
- F-232 neu und entschieden: Dokumente wie auf Papier – Steckbrief als Blatt im Hochformat wie Abbildung 3 im ICB4-Report, direkt bearbeitbar, Gesamtdauer, Risikorücklage in %, Kostensumme mit Budget-Abgleich, fixierte Meilensteine, Freigabe; Leiste „Verwaltung“, Rad „Größe“
- Projekt-Modus: Ansicht auf ganzer Breite unter der Projektzeile, Projekt wählen im Feld „Name“, Beispielprojekt „ColorGentlemen“ als Knopf in der Projektliste
- Hilfe und Begriff kitWatch, Handbuch V132, Lastenheft F-231/F-218/F-232, Entscheidungs-Doc F-232 (PDF lokal), APP_VERSION V132, Übergabe V132

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q5599QXUGV76XigkVb
```
