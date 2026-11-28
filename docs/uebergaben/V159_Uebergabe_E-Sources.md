# Übergabe V159 → V160 E-Sources

Stand: 28.11.2026 · Chat V159 · Nächster Chat: **V160 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V160 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **„Gebaut V159“** und **„Gebaut V158“** (unter F-236) und **F-227** (Handbuch). Docs K14 https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy, F-236 https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP, F-232 https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn, V156 https://claude.ai/artifact/F7iBBE93raKoH4eGpZVQep sind entschieden – nur auf neue Kommentare prüfen: Docs `read` auf das Projekt → Tab-Id, dann `query` mit `container {kind: project, id: <slug>}`, **`object: "utterance"`** (ohne wird abgelehnt), `payload {under: {object: file, id: <Tab-Id>}}`. Tab-Ids: K14 `0bcc4a34-acc2`, F-236 `a8d6803d-5122`, F-232 `46a5e669-c1bd`, V156 `f5a6eb8d-75bd`. Stand V159: keine Kommentare. **Neu offen: Doc „V159 – Portale: leerer Tab, Notizen und Projekte anzeigen“** https://claude.ai/artifact/VWfLCHtfkeR7oKv9jjRRT8 (Projekt `e6e412f7-b8eb-4e26-9513-7b3720ad6a6b`, Tab `ff01c696-81db`, PDF `docs/Arbeitspakete/V159_Portale_leerer_Tab.pdf`) – **entschieden 28.11.: Option B mit allen Vorschlägen P1–P8**, Zusatz Enrico: **das ES-Zeichen bleibt immer frei sichtbar – Leiste, Texte und Knöpfe stehen darunter, nie darüber** (heute liegen Name, Hinweis, „Neu in diesem Tab“ und Größe über dem Logo). Nur noch auf neue Kommentare prüfen, dann als **erstes Paket V160 bauen** (Lastenheft-Punkt anlegen, Handbuch Kap. 2/5, Tour/Hilfe). **Dann:** Enricos Prüfliste V159 unterstützen, Mängel beheben (Funktion vor Design); offene Punkte unten. Enricos Daten nicht verändern: nur ansehen bzw. mit `?test=voll` + Knopf „Beispielprojekt ‚ColorGentlemen‘ anlegen“. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report** (Vorlage `docs/Arbeitspakete/Vorlagen/Report_ColorGentlemen_CG-1.pdf`), **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **in Zellen immer alles lesbar (global)**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Browser-Hinweise `V150_…`/`V152_…`/`V156_…`/`V157_…`/`V158_…` und unten, kleine Punkte aus `V74_`–`V159_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein. **iPhone/iPad:** wenn Enrico auf Geräten testen soll, immer eine kurze Anleitung mit anklickbarer Adresse in den Chat (unten).

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl wie in `V157_Uebergabe_E-Sources.md` (Testliste aus den Dateien, jetzt **35** `*.test.ts`, neu `sampleRefresh`). Aufruf `timeout 175 bash $HOME/vt2/run.sh 2>&1 | grep -E "grün|FAIL" | awk '{s+=$1} END{print s}'` mit `timeout_ms: 180000`. Tests V159: **813** grün. `npx tsc --noEmit -p .` sauber.

**Löschen:** keine Freigabe in V159 (nichts gelöscht). In `Projects/Claude outputs` können weg: `toc-02.png`, `toc-03.png`, `v158-ref-03.png`, `v158-cg-logo.png`.

## Was in V159 passiert ist

1. **Docs** K14, F-236, F-232, V156: keine neuen Kommentare.
2. **Teamrollen „wieder raus“ geklärt und gelöst:** Enricos Beispiel war mit einer älteren Version angelegt. Neu **„Beispiel auffrischen“** (`workspace/sampleRefresh.ts`, Aktionen `sampleRefresh`/`sampleRefreshUndo`): ⚙ › „Beispielprojekt „ColorGentlemen“ auffrischen“ und Knopf „Beispiel auffrischen“ am leeren Formular (Meldung oben im Formular, Fokus auf „Rückgängig“). Regeln: leeres Projektfeld/Unterfeld/ganze Liste → ergänzen; Felder in Listeneinträgen, Vorgängen und Personen nur, wenn **kein** Geschwister sie hat; fehlende Vorgänge nur, wenn die ganze Art fehlt; Rückgängig stellt genau her. **Enrico hat es auf seinen Daten benutzt** – ergänzt u. a. Logo, Teamrollen, Nachrichtenquadrat, Moderationen, Maßnahmenplan, Anlagen.
3. **Start je Gerät und Desk im zuletzt gewählten Modus** (Enrico 14:23; `deskMode.startModes` lädt nur noch, erster Start Notizen). Ersetzt V158 „immer Notizen“; Hilfe, Tour-Text, Handbuch angepasst.
4. **Zellen lesbar – übrige Tabellen und schmale Fenster:** Gantt-Vorgangsname bis 45vw; Ressourcen-Name bricht um; Formular-Tabellen: Code-/Zahlspalten fest in px nach längstem Wert (`isFitCol`, `fitPx`), Textspalten teilen den Rest, Tabelle hat Mindestbreite und rollt im Blatt (`.paper__wrap` `minmax(0,1fr)`, `.paper--form` `min-width:0`). Gemessen: alle 41 Kapitel bei 700/1000/1400 px ohne abgeschnittene Zelle, bei 1400 ohne Seitenrollen; PSP/Gantt/Ressourcen bei 700/1000/1400 ohne Befund.
5. **Wünsche Enrico 14:24–14:30:** Formular-Meldungen schlossen nie → `noticeLater` (×2 mit Rückgängig), Fokus zurück ins Formular. Streifen über der festen Projektzeile (12px Innenabstand `.projlayer`) → Abstand in `.pj`. **Kopfzeile „Projektliste“ klebt oben** (Bandfarbe deckend: Verlauf über `--panel`), Projektzeile darunter (`--pj-headh`), Inhaltsleiste darunter (`--pj-sticky`), `scroll-padding-top` auf `.projlayer` (Fokus nicht hinter festen Zeilen, WCAG 2.4.11), Projektliste rollt in sich seitlich. **Erklärtexte in einer Zeile mit „mehr“** (Wahl per Frage) – `components/MoreLine.tsx`, gemerkt je Stelle in `esource.moreOpen.v1`, eingesetzt an 10 Stellen (Projektliste, Formulare, Risiken/Änderungen, Entscheidungen, Personen, Board-/Notizen-Layouts, Gantt-Phasen, Tasten Ressourcen/Netzplan). **15.1 Teammitglied doppelt** – unsichtbares `select` galt nur in Tabellen, jetzt überall in `.pjf__sel`.
6. **Wünsche Enrico 14:39–14:41:** Formulare **blättern** am Blattende („← Zurück“/„Weiter →“, `.pjf__pager`, `sectionRef.scrollIntoView`, Fokus aufs Kapitel-Rad). **Inhaltsleiste** (`ContentsRail`) klebt auf allen Breiten (≤900 px über dem Blatt, 32vh, `grid-template-rows: auto minmax(0,1fr)`), aktiver Eintrag bleibt sichtbar (nur Liste rollt), zugeklappt mit aktuellem Kapitel (`.tocrail__cur`). Geprüft bei 820×1180 und 1400. **ES-Zeichen** (`assets/es-mark.svg`, wie `tools/wallpaper.py` ohne „ources“) als `.esmark` in leeren Portalen (`PanelFrame`, Zweig `!url`) und leerer Notizfläche (`Pad`, `nblock__pick`); Notizfläche im Browser gesehen, leeres Portal nicht (im Test alle Tabs belegt).
7. **Enrico 14:46 – Portale:** Anlegen im leeren Tab (Notiz, To-do, Kanban, Eisenhower → `NewInTab`, `tab.note`/`tab.view`) verwirrt, Aussehen passt nicht zu den Notizen. Wunsch: Portale **zeigen** Notizen und Projekte, unter dem ES-Zeichen eine Auswahl für Notizen, Projekte und Portal-Funktionen, bedient wie die Kopfleiste. Grundsatzfrage → Entscheidungs-Doc (Optionen A/B/C, Fragen P1–P8); **entschieden: B mit allen Vorschlägen, ES-Zeichen immer frei** (Enrico 14:48). **In V159 nicht gebaut** – erstes Paket V160.
8. **iPhone/iPad:** Enrico startet `npm run dev -- --host`; Adresse „Network:“ **http://192.168.178.126:2910/** (normale Ansicht, nicht `?test=voll`). Handbuch Kap. 1.
9. Handbuch V159 (Kap. 1, 7, 7.1, Änderungsverzeichnis); Lastenheft „Gebaut V159“; `APP_VERSION = 'V159'`; Live-Projekt V159 (206 F-Punkte, 3 ersetzt, 131 fertig, 25 teilweise, 47 offen).

## Offen

- **iPad-Test:** Enrico hat die Adresse bekommen; Rückmeldung zum Ergebnis steht aus. Anleitung bei Bedarf erneut:
  1. Mac: im Ordner `e-sources/web` → `npm run dev -- --host` (läuft schon einer: erst Ctrl+C)
  2. iPhone/iPad im selben WLAN
  3. Antippen: http://192.168.178.126:2910/ (Adresse kann sich ändern → steht bei „Network:“)
  Erst nach Rückmeldung ggf. `server.host: true` fest in `vite.config.ts` (Enrico wurde gefragt; Nachteil: im fremden WLAN für alle erreichbar).
- **`npm audit`:** Ergebnis kam wieder nicht mit („[hier einfügen]“). Einordnung wie V157 (Paged.js bringt `@babel/polyfill`, `core-js` 2 u. a. mit).
- **Gantt in schmalen Fenstern:** Tabelle (jetzt breiterer Name) nimmt bei 700 px fast die ganze Breite; Balken nur per Seitenrollen. Bei Bedarf Trenner zum Ziehen wie MS Project oder Spalten ausblendbar.
- **Leeres Portal mit ES-Zeichen** im Browser ansehen (Test-Desk hatte keinen freien Tab) – Größe/Deckkraft ggf. mit Enrico abstimmen (`.esmark`: min(42 %, 220 px), 0,22). Weitere leere Flächen (leeres Kanban, leere Matrix, Pad ohne Reiter) bei Bedarf ebenso.
- **Schmale Formular-Tabellen mit Text neben vielen Betragsspalten** (z. B. Kosten/Earned Value bei ~700 px): Textspalte bricht fast buchstabenweise um – lesbar, aber unschön; ggf. Textspalten-Mindestbreite je Tabelle höher (dann rollt sie früher seitlich).
- **Weitere Erklärtexte** als `MoreLine`: Grafik-Unterschriften in Formularen (z. B. 15.1 „Teamrollen nach Belbin wie Abbildung 16 …“, `figcaption.help__text`), Gantt-Summe, Cases/Rules-Intros – Enrico fragen bzw. gleich mitziehen.

## Prüfliste für Enrico (zusätzlich zu V77–V158)

- **Auffrischen:** ⚙ › „Beispielprojekt „ColorGentlemen“ auffrischen“ → jetzt „vollständig – nichts zu ergänzen“.
- **Start:** z. B. im Projekt-Modus schließen/neu laden → startet wieder im Projekt-Modus; auf dem iPad eigener Stand.
- **Projekt-Modus scrollen:** Kopfzeile „Projektliste“ (grau) und Projektzeile bleiben oben, kein Streifen darüber; Inhaltsleiste links nicht verdeckt; Tab durch ein Formular → Feld nie hinter den festen Zeilen.
- **Erklärtexte:** eine Zeile mit „mehr“; „mehr“ → ganzer Text, nach Neuladen weiter offen; „weniger“.
- **Formular-Meldungen** (z. B. Zeile löschen) verschwinden nach der Meldungsdauer; „Rückgängig“ bleibt doppelt so lange.
- **15.1 Teammitglied:** Name nur einmal.
- **Schmales Fenster / iPad hochkant:** Formulare 5 Chancen und Risiken → Tabelle rollt seitlich, Zahlen nicht abgeschnitten; Gantt-Namen ganz; Ressourcen-Namen brechen um.
- **Blättern:** Formulare bis ans Blattende scrollen → „Zurück“/„Weiter“ mit Kapitelnamen; Klick → neues Kapitel oben.
- **Inhaltsleiste:** beim Scrollen und Blättern bleibt sie stehen, aktives Kapitel immer sichtbar markiert – auch auf dem iPad hochkant; zugeklappt steht das Kapitel am Knopf.
- **ES-Zeichen:** leere Notizfläche (keine Notiz offen) und leeres Portal (Tab ohne Seite) zeigen das ES-Zeichen dezent in der Mitte.
- **iPad:** Adresse oben öffnen, Bedienung testen (Touch, Räder, Pads).
- Weiter offen aus V158/V157/V156/V155/V154/V153/V152/V151/V150/V149.

## Browser-Hinweise (V159)

- Eingebauter Browser hat eigenen Speicher – Enricos Daten liegen in seinem Chrome; zum Prüfen nur `?test=voll`.
- **Kopfleiste schmal:** ⚙ steckt im Überlauf → erst `button[aria-label^="Kopfleiste:"]`, dann `button[aria-label="Einstellungen"]`.
- **Rad „Ansicht des gewählten Projekts“ läuft nicht rund** (PSP = 1 von 13 ist Anschlag) – Richtung nach Reihenfolge wählen: PSP, Formulare, Gantt, Netzplan, Entscheidungen, Risiken, Steckbrief, Ressourcen, Änderungen, Meldungen, Kanban, Layout, Inhalt.
- **Zellen messen (alle Tabellen):** Elemente in `main table td/th` (und Nachfahren) mit `overflow` ≠ visible oder Ellipse bzw. Feld, `scrollWidth > clientWidth+1`; `.mwheel__win` und `.sr-only` ausnehmen. Seitenrollen: `.pjs__left` `scrollWidth > clientWidth`. Kapitel-Rad Schritt für Schritt (≈0,4 s), 20 Kapitel je Aufruf (45-s-Grenze).
- Nach Server-Neustart (Enrico mit `--host`) lädt die Seite neu – Testdaten neu anlegen.

## Kleine Punkte

- Offen aus V158: Inhaltsverzeichnis im Bericht 2 Seiten bei 53 Einträgen; Eisenhower 15.2 Alt+Pfeile vs. Sheet Alt+↑/↓ (NF-08); „Starttermin: gespeichert.“ in der Testbelegung; „nach unten verschoben“ klein; zwei Meldungen beim Bild-Einfügen.
- `MoreLine` misst per `ResizeObserver`; der Knopf „mehr“ erscheint nur, wenn der Text nicht passt.
- Formular-Spaltenbreiten: Textspalten min. 52 px, Rand 8 px – bei 1400 px passt 5 Chancen und Risiken gerade (999 von 1002 px). Neue Spalten in 5 können dort Seitenrollen auslösen.

## Commit-Text V159 (e-sources)

**Summary:** `V159: Beispiel auffrischen, Start im zuletzt gewählten Modus, Zellen lesbar überall, feste Kopfzeile, Blättern in Formularen, ES-Zeichen`

**Description:**
```
- Beispiel auffrischen (⚙ und am leeren Formular): ergänzt nur, was seit der Anlage neu ins Beispiel kam (Teamrollen, Logo …), eigene Änderungen bleiben, mit Rückgängig
- Start je Gerät und Desk im zuletzt gewählten Modus (Notizen, Projekte, Desk) statt immer Notizen
- Zellen lesbar: Gantt-Vorgangsname und Ressourcen-Namen ganz; Formular-Tabellen mit Code-/Zahlspalten nach Inhalt, rollen in schmalen Fenstern seitlich (41 Kapitel bei 700/1000/1400 px gemessen)
- Projekt-Modus: Kopfzeile „Projektliste“ und Projektzeile bleiben beim Scrollen lückenlos oben, Inhaltsleiste darunter, Fokus nie hinter festen Zeilen
- Erklärtexte in einer Zeile mit „mehr“ (je Stelle gemerkt) an 10 Stellen
- Formulare: „Zurück“/„Weiter“ am Blattende; Inhaltsleiste bleibt auf allen Geräten stehen und zeigt das aktive Kapitel
- ES-Zeichen dezent in leeren Portalen und leerer Notizfläche
- Formular-Meldungen schließen nach der Meldungsdauer; 15.1 Teammitglied nicht mehr doppelt
- Entscheidung Portale (leerer Tab zeigt statt anzulegen, Leiste wie Kopfleiste, ES-Zeichen frei) im Lastenheft und in der Übergabe – Bau in V160
- Tests 813 (Beispiel auffrischen); Handbuch V159 (inkl. iPhone/iPad-Test), Lastenheft „Gebaut V159“, APP_VERSION V159, Live-Projekt V159, Übergabe V159

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q5Z6tyRXtcsVuph2KB
```
