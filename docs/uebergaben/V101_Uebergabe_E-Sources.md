# Übergabe V101 → V102 E-Sources

Stand: 25.11.2026 · Chat V101 · Nächster Chat: **V102 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V102 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-221** (Feedback, **entschieden V101 – FB1–FB12 gelten**, Enrico: „Wir übernehmen beim Feedback auch deine Vorschläge. Die Tests werden es zeigen, was wir ändern müssen.“) und **F-206 Schritt 10** („Gebaut V101“). Entscheidungs-Doc F-221: https://claude.ai/artifact/1M5KSM6VeL87nW12zuBPQj (PDF `docs/Arbeitspakete/F-221_V101_Feedback.pdf`); Vorlage Enrico: Problemstellung aus der Empirie (Anlass & Kontext, Hintergrund, Lösungsansatz mit Zielen/Nicht-Zielen und Skizze, Relevanz, Hypothesen, Vermerke zur Weiterverarbeitung – „nicht so aussehen, aber in diese Richtung“). **Termin: Feedback Bau 1–5 fertig bis Fr 04.12.2026** (Enricos Testphase während der Weiterbildung ab 07.12.). **Neu am Ende von V101: F-222 Nutzwertanalyse als Werkzeug in E-Sources** (Vorlage `docs/Arbeitspakete/Vorlagen/Nutzwertanalyse-Vorlage_es.numbers`, Lastenheft F-222) – Grundsatzfragen im Entscheidungs-Doc, sobald F-221 läuft bzw. im Restplatz. Weiter gelten V98-Doc (K1–K8), V96-Doc, F-220 (R1–R7, Bau nach Feedback). Leitlinien: **Trello** für Karte und Board, **IPMA ICB4** und **MS Project / iTaskX** für Projekte, Design und Anordnung an unsere Anwendung angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V101_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V101 passiert ist

`npx tsc --noEmit -p .` sauber. Tests mit `vitest-ersatz.js`: workspace **485** (+5), persons 16, stage 4, noteSources 1 – alle grün. **Enrico bitte `npm test` in `web/`.** Im eingebauten Browser angesehen (`localhost:2910/?test=voll`, 1440 × 900): ⚙ › Beispielprojekt, Rad „Ansicht“ → Gantt, Wochen/Monate, Alt+V, Vorgänger „25AA+2“ übernommen, „99“ abgelehnt, Kreis „2 → 3 → 7 → 2“ gemeldet, Dauer 40 → „Ende nach Stichtag 18.01.27“ rot, PSP zeigt dieselben Angaben unten – keine Fehler in der Konsole.

1. **Gantt-Logik** `workspace/gantt.ts` (`ganttOf`, `parsePredInput`, `setPreds`, `predText`/`predsText`) und in `schedule.ts` `workdayNo`/`dayOfWorkdayNo` (Arbeitstage fortlaufend). Vorwärts-/Rückwärtsrechnung, Puffer, kritischer Pfad, Sammelvorgänge geben Vorgänger und „nicht vor“ an Kinder weiter, manuell = „nicht vor“ + Dauer mit Konflikt-Hinweis, Stichtag K3 nur Hinweis, Kreise gemeldet. Aktion `taskPreds`.
2. **Gegenprüfung ColorGentlemen:** kritischer Pfad wie Report Abb. 13 (M0 → Projektstart → Schlüsselübergabe → Start B&U → Schäden → Elektrik → LA1 → Abstimmung → LA2 → Projektabschluss → Projektende); Ende 22.06.2027 statt 30.06. = 6 fehlende Feiertage. **Beispielprojekt geändert:** „nicht beginnen vor“ nur noch ohne Vorgänger (vorher auf jedem Vorgang = Einschränkung, hätte den Pfad verfälscht).
3. **Oberfläche** `components/ProjectGantt.tsx`: Rad „Ansicht“ Steckbrief · PSP · **Gantt**; Tabelle (Nr., Code, Vorgang, Dauer, Anfang, Ende, Vorgänger) fest links, Zeitachse rechts (Rad Tage · Wochen · Monate, `esource.gantt.v1`), Balken/Klammer/◆/⇩ Stichtag/Heute, Pfeile, „Kritischen Pfad zeigen“. Gemeinsamer Hook `usePspTree` in `ProjectPsp.tsx` (PSP und Gantt gleiche Tasten), `TaskInfo` exportiert mit **Termine** und Feld **Vorgänger** (auch im PSP), `fmtDay`.
4. Texte `GANTT_TEXT`, Begriffe `TERMS.gantt/criticalPath/totalFloat/predecessors/deadline`, Hilfe „Gantt (Balkenplan)“ (Symbol `project`), CSS „V101“ am Ende von `App.css`.
5. **F-221 Feedback neu und entschieden** (Wunsch Enrico mitten im Chat): Doc, PDF, Lastenheft, Reihenfolge Punkt 36 – **vor** dem Rest von Schritt 10 und vor F-220. `.gitignore` + `docs/Feedback/`.
6. **F-222 Nutzwertanalyse neu** (Wunsch Enrico nach der Übergabe-Vorbereitung: „Nicht als Excel, sondern als nutzbares Tool in E-Sources“): Vorlage als `.numbers` in `docs/Arbeitspakete/Vorlagen/` abgelegt (nur lokal), Lastenheft-Eintrag mit dem Inhalt aus dem Vorschaubild, Reihenfolge Punkt 37.

## Nächste Schritte

1. **F-221 Feedback** nach Doc (Bau 1–5, bis 04.12.): 1 Logik `workspace/feedback.ts` mit Tests (`Workspace.feedback`, Arten, Felder der Problemstellung, Zustand Neu · Gesichtet · Geplant · Erledigt · Verworfen, Vermerke, Spur, Ort/Version/Gerät/Bildschirm/Zeit, Ausgabe Markdown + JSON) + **Dateiformat 11** – gleich mit den Feldern für F-220 R5 (`order`, `pinned`, `hidden` je Rad, abgeglichen) · 2 Schnell erfassen (Knopf „Feedback“ im Desk-Kopf neben „?“, Alt/⌥+F, ⋮ Portal/Pad, Suche; Fenster am Ort) · 3 Ausarbeiten (Felder, Bild wie Notizbilder, „noch offen: …“, „War das Melden einfach?“ 1–5) · 4 Cockpit „Feedback“ als Board wie Kanban mit Kartenfenster, Filter, „Als Datei speichern“ · 5 Hilfe, Begriffe, Tour, Prüfliste.
2. **F-222 Nutzwertanalyse:** Entscheidungs-Doc an der Seite (eigenes Sheet oder Projekt-Ansicht, Paarvergleich, Verknüpfung mit Notizen/Sources, Diagramm, Ausgabe) – Doc gern parallel zu F-221 anlegen, damit Enrico antworten kann; Bau nach F-221 (Termin 04.12. hat Vorrang).
3. Dann weiter Schritt 10: **Meilensteine** → **Basisplan** („Basisplan speichern“ mit Rückfrage/Rückgängig, grauer Soll-Balken im Gantt) → **Netzplan** → **F-220** → Ressourcen je Projekt (Task-Limit) → Bericht (ICB4, PDF) → Projekt-Desk.
4. Projekt-Modus ausbauen: Filter nach Scope (J12), Quellen am Projekt (Q12), Tour „Projekte“ (F-217).
5. Touren aus V98 im Browser messen (`?test=voll`).
6. Portfolio „Aktuelles“ nachziehen (seit V83; `~/Projects/SchulzEnrico.github.io`, `#aktuell` DE/EN): Notizen, Kanban, Personen/Projektfokus, Main Stage, Touren, Projekte, PSP, Gantt.
7. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V100 plus:
   - `npm test` in `web/`.
   - Beispielprojekt **im ⚙ entfernen und neu anlegen** (das alte hat „nicht beginnen vor“ an jedem Vorgang und rechnet darum anders).
   - Rad „Ansicht“ → Gantt: Balken, Pfeile, rote kritische Kette, ◆, Stichtag ⇩; Zeitachse Tage · Wochen · Monate (bleibt nach Neuladen); „Kritischen Pfad zeigen“ aus/an.
   - Tasten wie PSP, Alt/⌥+V springt zu „Vorgänger“; „3; 5AA+2“ eintragen, Unsinn → Meldung am Ort, Kreis → Weg.
   - Dauer verlängern → Ende rot mit „!“ und „Ende nach Stichtag …“ unten.
   - Manuell planen mit früherem „nicht beginnen vor“ → Anfang rot „Vorgänger erlauben frühestens …“.

## Kleine Punkte (neu in V101)

- Kalender ohne Feiertage (K7) – ColorGentlemen endet darum 6 Arbeitstage früher als im Report. Eigene Kalender/Feiertage später (MS Project: Projektkalender).
- Fokus-Last (`focusLoad.spanOf`) nimmt weiter „nicht beginnen vor“ bis „fällig am“ – nach der Änderung am Beispielprojekt verteilt sie die Stunden der Vorgänge nur noch auf die Woche vor „fällig am“. Besser: gerechnete Gantt-Termine verwenden (bei Basisplan/Ressourcen mit erledigen).
- Vorgänger auf **Sammelvorgänge** (AA/AE) werden in der Rückwärtsrechnung vereinfacht auf alle Kinder angewandt (eher zu viel „kritisch“). Im Beispielprojekt nicht benutzt.
- Meilenstein, den „nicht beginnen vor“ setzt, zeigt diesen Tag; vom Ende eines Vorgängers gesetzt zeigt er dessen letzten Tag (wie MS Project 8:00/17:00).
- Kreis über Sammelvorgang und Kind (eigener Sammelvorgang als Vorgänger) verhindert `setPreds` (Grund „family“); per Datei hereingekommene Kreise zeigt der Gantt als Meldung, Bezüge im Kreis zählen nicht.
- Gantt-Zeilen haben feste Höhe 28 px (Tabelle und Zeitachse müssen gleich bleiben) – lange Namen werden mit „…“ gekürzt (voller Name im Tooltip/Zeilennamen).
- Bei sehr schmalem Desk (< 1100 px) steht die Projektliste über dem Gantt; der Gantt scrollt in beide Richtungen, die Tabelle bleibt links stehen.
- Erster Monatsname im Kopf fehlt, wenn der Monat nur ein paar Tage im Bild hat (< 30 px) – gewollt.
- `TaskInfo` rechnet den Gantt fürs PSP mit (bei großen Projekten ggf. einmal oben rechnen und hineingeben).
- Die Vorgänger-Spalte zeigt Nr. (MS-Project-Schreibweise), nicht PSP-Codes; Nr. ändern sich beim Verschieben im PSP (wie MS Project).
- Browser-Test: Sample über ⚙ `getByRole('menuitem',{name:/Beispielprojekt/})`; Rad per Fokus + Pfeiltaste; `setViewportSize(null)` am Ende.

## Commit-Text V101

**Summary:** `V101: F-206 Schritt 10 – Gantt mit Vorgängern, Puffer, kritischem Pfad und Stichtag; F-221 Feedback entschieden, F-222 Nutzwertanalyse neu`

**Description:**
```
- gantt.ts: Terminrechnung wie MS Project/iTaskX (ICB4 Netzplantechnik):
  Vorwärts-/Rückwärtsrechnung über EA/AA/EE/AE mit Abstand, Projektstart
  und „nicht beginnen vor“, manuell geplante Vorgänge, Sammelvorgänge,
  Gesamtpuffer, kritischer Pfad, Stichtag-Hinweis (K3), Kreise
- Vorgänger eingeben wie MS Project („3; 5AA+2“), Kreis- und
  Sammelvorgang-Prüfung; Aktion taskPreds
- Gegenprüfung ColorGentlemen: kritischer Pfad wie im Report; Beispiel-
  projekt setzt „nicht beginnen vor“ nur noch ohne Vorgänger
- Projekt-Modus: Rad „Ansicht“ Steckbrief · PSP · Gantt; Gantt mit
  Tabelle, Zeitachse (Tage/Wochen/Monate), Balken, Meilensteinen,
  Pfeilen, Stichtag, Heute-Linie; Tastatur wie PSP, Alt+V Vorgänger
- Angaben des Vorgangs (PSP und Gantt): Termine, Puffer, Vorgänger
- Hilfe „Gantt“, Begriffe; Tests (485)
- Lastenheft F-206 Schritt 10, F-221 Feedback (neu, entschieden),
  .gitignore docs/Feedback/, Übergabe V101
```
