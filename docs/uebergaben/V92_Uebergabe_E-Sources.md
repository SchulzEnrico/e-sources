# Übergabe V92 → V93 E-Sources

Stand: 25.11.2026 · Chat V92 abgeschlossen · Nächster Chat: **V93 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V93 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-218** („Gebaut V92“), **F-219** und **NF-08**. Leitlinie: **an Trello und unserer UX/UI ausrichten**, **Funktion vor Design**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Metall-/Glas-Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; offene kleine Punkte aus `V74_`–`V92_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V92 passiert ist

Tests **463 grün** (V91: 459). `npx tsc --noEmit -p .` sauber. Im eingebauten Browser geprüft (`localhost:2910/?test=voll`, 1600 × 950), keine Fehler in der Konsole.

1. **F-218 Oberfläche** (RG1, RG5, RG6): Bereich „Regeln“ (`components/Rules.tsx`) mit Gruppen-Rad **Portale · Notizen · Anzeige** oben; Schalter A1–A9 als Zeile (Name, Nummer, Satz, Umschalt-Rad; „geändert“ bei Abweichung vom Werk); unter „Notizen“ Block **„Wenn … dann …“** W1–W4 (Häkchen); unter „Anzeige“ Verweis A10 (Pausieren im Zahnrad). Rad „Regeln“ im Cockpit-Kopf jetzt auch in der Ansicht „Notizen“ (heißt dort „Notizen | Regeln“) und öffnet die Gruppe Notizen. Aktionen `ruleSwitch`, `ruleWhen`, `ruleSweep`. Kurznamen für das Rad in `RULE_SET_TEXT.short`.
2. **F-218 Einbau:** A1 `noticeLater`/`setNoticeMs` in `flash.ts` (ersetzt `NOTICE_MS` in allen Bauteilen; App setzt den Wert aus `noticeMs(ws)`), A2 `wipGate` im Kanban, A3 `lockOf`, A4 Abnahme direkt, A5 `RS.foldsDone` + `useFoldTick` (To-do, Kanban; `todoRows` hat Parameter `now`), A6 `newPad` (letzter Platz) bzw. Menü öffnet den Lageplan, A7 `dropEmpty` in `pads.ts`, A8 `useReminders(list, { sound, system })` – **Werk von „Mitteilung“ auf „an“ gedreht** (`['on','off']`, = bisheriges Verhalten), A9 `openElsewhere` (bookmarks.ts) + `sameSourceOk` in App (Suche/`openHit` und Library des Portals). W1/W2 im `reducer` über `Sh.applyWhenRules(prev, next)` (nur Übergänge, nicht bei `remote`); W3/W4 30 s nach Start und stündlich, Hinweis „Regeln: n archiviert …“. W1-Text: „Wenn eine Notiz erledigt wird – etwa eine Karte in eine Erledigt-Spalte kommt – …“. Hilfe „Regeln“ ergänzt. Tests (4 neu).
3. **Wünsche Enrico während V92 (umgesetzt):**
   - **Walzen raus** an allen Umschalt-Rädern und am Überschrift-Rad („nehmen zu viel Platz weg“).
   - **Glasknopf** nach Vorlage `Metall_Glasknoepfe_Chromrahmen.png` (zweiter Knopf): schwarzes Glas, feiner Chromrahmen, Glanz obere Hälfte, Glanzpunkt oben rechts, Schatten darunter; äußerer Neumorphism-Knopf entfällt; Hover/Fokus = Chromrahmen glüht in Akzentfarbe. Gilt für alle Räder + Überschrift-Rad (NF-08). CSS-Blöcke „V92“ am Ende von `App.css`.
   - **Design anpassen:** Rad nur **Dunkel · Hell · Wie System**, darunter **„Alte Systeme“ einzeln** (Wahlknöpfe im Raster, `design__retros`), dann Akzentfarbe. Altes System aktiv → Rad steht zwischen den Rasten auf dessen Namen. Text `DESIGN_TEXT.retroHead`.
   - **Tooltip hinter Dialog:** `Tooltip.tsx` hängt den Tooltip in einen offenen `dialog` (oberste Ebene), sonst an `body`.
4. Lastenheft: F-218 ● (Prüfung offen), Zählzeile V92.

## Nächste Schritte

1. **Enricos Rückmeldung** zu Glasknopf (Glanz stark genug? Höhe), Design-Dialog, Regeln-Bereich einarbeiten.
2. **F-219 Design** (bestätigt): Portale im Look der Pads (Glas-Kopf mit Licht von oben, Reiter, Clay, schmaler Rahmen), dunkle Grundfarbe bleibt, auch Light Mode; **zuerst an einem Slot Vorher/Nachher (Bildschirmfoto) zeigen**, dann übertragen. Dabei `.lc__band h3` (V91) ansehen.
3. Danach (N13): Notiz ↔ Quelle (Schritt 6) → Personen + Projektfokus (8) → Rest Schritt 9 → Touren (F-217, Tour „Cockpit“ um Notizen-Layouts und Regeln-Gruppen). Portfolio „Aktuelles“ nachziehen (seit V83).
4. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V91 plus:
   - Cockpit › Regeln: Rad Portale/Notizen/Anzeige; Schalter drehen; aus Cockpit „Notizen“ landet man in „Notizen“.
   - A1 „bis Klick“: Pad-Sheet löschen → Meldung bleibt bis zum nächsten Klick. A2 „sperren“: Karte in volle Spalte → Meldung am Ort, nichts passiert. A4 „ohne Rückfrage“. A5 „nach 2 s“/„nie“ in To-do und Kanban. A6 „letzter Platz“/„Lageplan fragen“ (Desk-Modus, Menü Notizen & Aufgaben › Neues Pad). A7 „behalten“: leeres Sheet schließen → bleibt in der Library. A8 Ton aus. A9 „hinspringen“/„fragen“ über die Suche.
   - W1 an: Karte mit Checkliste nach „Erledigt“ → alle Kästchen abgehakt, Spur „Regel W1 · …“. W2 an: letztes Kästchen abhaken → Karte eine Spalte weiter. W3/W4 an: nach 30 s Hinweis.
   - Räder als Glasknopf in Kopfleiste, Cockpit, Menüs, Design, Pad-Überschrift (hell und dunkel, alte Systeme).

## Kleine Punkte (neu in V92)

- A1 „bis zum nächsten Klick“: jeder Zeigerdruck irgendwo schließt alle offenen Meldungen am Ort (auch eine neuere) – gewollt einfach. Tastatur allein schließt nicht (Meldung bleibt bis zum nächsten Klick); bei Bedarf Esc ergänzen.
- A2 „nur kennzeichnen“: legt ab ohne Frage, Zähler rot (wie bisher „! über Limit“).
- A6 „Lageplan fragen“ gilt nur im Menü „Notizen & Aufgaben“; „Neues Pad“ aus dem Cockpit „Notizen“ nimmt dann die rechte Hälfte.
- A9 wirkt bei Suche und Library des Portals; Senden aus anderen Fenstern/Bookmarklet (`sendToPanel`) prüft es nicht. „Fragen“ ist ein Hinweis unten mit „Hier trotzdem öffnen“ (kein Dialog) – Regel „Meldung am Ort“ dort nicht erfüllt (kein Ort); bei Bedarf am Treffer zeigen.
- W1 greift bei jeder Notiz, die erledigt wird (auch To-do-Haken), nicht nur im Kanban. W2 rückt je Kanban genau eine Spalte weiter, auch über „in Prüfung“ hinaus nur bis zur letzten Spalte.
- W3/W4 laufen in jedem offenen Fenster (idempotent, harmlos); Hinweis unten.
- Glasknopf: Glanz/Glanzpunkt über `::before/::after` von `.mwheel__dial` bzw. `.rpick__wheelwrap` (Überschrift-Rad) – die alten Walzen-Pseudoelemente sind damit ersetzt. In hellen Darstellungen und alten Systemen nicht eigens angesehen.
- Rad „Darstellung“ hat kein „ringsum“ mehr (3 Rasten, Anschlag).
- Tooltips in Dialogen hängen im `dialog`; ein Dialog mit `transform` würde die Lage verschieben (heute keiner).
- `remindSystem` Werk jetzt „an“ (Doc sagte „aus“) – sonst hätten bisherige Nutzer mit Erlaubnis keine Mitteilungen mehr.

## Commit-Text V92

**Summary:** `V92: F-218 Regeln – Oberfläche (Gruppen-Rad, A1–A9, Wenn-dann W1–W4) und Einbau; Räder als Glasknopf ohne Walzen, Design-Dialog mit alten Systemen`

**Description:**
```
- Cockpit „Regeln“: Gruppen-Rad Portale · Notizen · Anzeige, Schalter
  A1–A9 mit Umschalt-Rad, Block „Wenn … dann …“ W1–W4; Rad Regeln
  auch im Cockpit „Notizen“ (öffnet Gruppe Notizen)
- Einbau: Meldedauer (noticeLater), WIP nachfragen/sperren/kennzeichnen,
  Schloss, Abnahme ohne Rückfrage, Erledigte einklappen, Platz neuer
  Pads, leere Sheets behalten, Erinnerung Ton/Mitteilung, gleiche
  Source (neuer Tab/hinspringen/fragen)
- W1/W2 nach jeder Änderung (applyWhenRules), W3/W4 beim Start und
  stündlich; Hilfe „Regeln“ ergänzt
- Umschalt-Räder und Überschrift-Rad: Walzen entfernt, Glasknopf mit
  Chromrahmen, Glanz und Glanzpunkt (Vorlage Enrico)
- Design anpassen: Rad Dunkel · Hell · Wie System, alte Systeme einzeln
- Tooltip erscheint in Dialogen über dem Dialog
- Lastenheft F-218, Übergabe V92, Tests 463 grün
```
