# Übergabe V73 → V74 E-Sources

Stand: 24.11.2026 · Chat V73 · Nächster Chat: **V74 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V74 E-Sources**. Lies diese Übergabedatei, dann `V72_Uebergabe_E-Sources.md` (Nächste Schritte 3–5, Kleine Punkte) und im Lastenheft **F-215** (Abschnitte „V72 (Enrico)“ und „V73“). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`). Lies `web/src/components/RemindAlarm.tsx`, `web/src/workspace/remind.ts` (Abschnitt „V73“) und in `App.css` die Stellen „V73“. Dann „Nächste Schritte“ ab 1.

## Was in V73 passiert ist

- **Prüfung im eingebauten Browser (Claude, `localhost:2910/?test=voll`):**
  - Clay-Liste, „Neue Note“ (Neumorphism), Pad-Kopf: ✓ (Radius 7 px, volle Breite).
  - Chips: Schnellwahl ✓, ✕ ✓ (Fokus zurück auf „Wann?“), Ort mit Enter ✓, Ansage ✓.
  - ↓ wischen ohne offene Note: legt Erinnerungs-Note an, Fokus im Editor ✓.
  - Schreibmarke beim Wischen während des Schreibens: bleibt ✓ (Position und Weitertippen).
- **Fehler gefunden und behoben:**
  - Esc im Menü „Wann?“ löste zusätzlich die Rückfrage „Änderungen nicht gespeichert“ aus (NoteTab fängt Esc in der Capture-Phase) → `.remind__menu`/`.remind__chip--input` ausgenommen.
  - Enter im Datumsfeld öffnete das Menü gleich wieder → `preventDefault`.
  - Menü „Wann?“ schließt jetzt bei Klick außerhalb und übernimmt dabei ein gewähltes Datum (Kleiner Punkt V72 erledigt).
  - Schmales Pad (≤ 300 px, `@container pad`): Kopf lief über (✕ 9 px außerhalb, „+ Sheet“ über dem Reiter) → engere Abstände, nur „+“; Entwurfsleiste (Speichern/Verwerfen/Schließen) stapelte sich 150 px hoch über dem Text → einzeilig nur mit Symbolen (Name bleibt für Bildschirmleser und im Tooltip).
- **Wünsche Enrico (während V73):** Knöpfe im Pad-Kopf (+ Sheet, ⋮, ✕) 15 % kleiner (29×26 statt 34×30, Symbole 13 px, Schrift 11 px); Hover dieser drei deutlich stärker (Akzentverlauf, weiße Schrift, Anheben 1,06, Leuchtrand); Hover der Bedienelemente in der Note (Werkzeugleiste, Löschen, Speichern/Verwerfen/Schließen, „Neue Note“) wie bei „Wann?/Wo?“ (Akzentring + Leuchten). **Von Enrico noch nicht angesehen.**
- **Gebaut – Schritt 2 Erinnerung (Meldung am Pad):** `RemindAlarm.tsx` oben im Notizblock; `remind.ts`: `remindTime` (Schlummern = späterer Zeitpunkt), `dueReminders(notes, now, seen, since)`, `seenReminders`/`markSeen` (`localStorage` `esource.remind.seen.v1`, je Browser). Prüft alle 15 s und bei `visibilitychange`, nur solange das Pad offen ist. „Verpasst“ = fällig vor dem Öffnen des Pads. „Öffnen“ öffnet die Note, ✕/Esc schließt. Mehrere fällig: „und n weitere“. Systemmitteilung nur über Knopf „Auch als Mitteilung“ (`Notification.requestPermission`) und nur, wenn der Tab nicht sichtbar ist. Erinnerung in der Notizliste („· Heute, 17:40“). Hilfe `noteRemind` (+ `HELP_ICON` `recent`). Texte in `REMIND_TEXT`.
- **Tests:** 378 grün im Ersatzlauf der VM (+2: fällige Erinnerungen, gemeldet/erledigt/geschlummert). Auf dem Mac `npm test` bestätigen lassen.

## Nächste Schritte

1. **Enrico:** im Browser ansehen – Pad-Kopf (kleiner, Hover), Hover in der Note, Meldung am Pad (Erinnerung auf eine Uhrzeit in 1–2 Minuten setzen, Pad offen lassen; einmal Pad schließen, Zeit verstreichen lassen, wieder öffnen → „Verpasst“), „Auch als Mitteilung“ (erscheint nur, wenn der Browser noch nicht gefragt hat; im eingebauten Browser nicht sichtbar). Testzahl nennen.
2. **Telefon A2 + C** (siehe V72 Schritt 3).
3. **Umschalter Desk | Notes** (V72 Schritt 4).
4. Schieberegler H1–H3, dann Sprachnotiz (V72 Schritt 5).

## Kleine Punkte (neu in V73)

- ↓ „fett“ auf der Überschriftszeile macht sie *nicht* fett (`font-weight: normal`), weil Überschriften schon fett sind – evtl. auf Überschriften ↓ = zurück zu Text oder nichts tun.
- Neue Erinnerung per ↓: „Wann?“ könnte gleich aufgehen (spart einen Tipp).
- Wiederholung (`remind.repeat`) und Schlummern (`snooze`) haben noch keine Bedienung; „Später (10 Min.)“ in der Meldung wäre naheliegend.
- Eine Zeit in der Vergangenheit setzen meldet sofort als „Verpasst“ (Zeitpunkt lag vor dem Öffnen des Pads) – ok?
- Chip mit langem Datum („Do 26.11., 10:15“) bricht im schmalen Pad um – jetzt `nowrap` nur ≤ 300 px.
- Im Testbrowser: native Datumsauswahl (`showPicker`) schluckt Tasten – Datum per `evaluate(e => e.value = …)` setzen und daneben klicken. Ziehen über einem Portal (iframe) bleibt im Test hängen („is-swiping“) – innerhalb des Pads ziehen. Neue Dateien lösen ein volles Neuladen aus → Teststand weg (Pad neu anlegen, Menüeintrag `menuitem` „Neues Pad“).
- Weiter offen aus V72: RemindChips über der Leiste statt direkt unter dem Titel (Enrico fragen); `recentPlaces` bei vielen Notes merken.

## Commit-Text V73

**Summary:** `V73: Erinnerung meldet sich am Pad, Fehler Wann-Menü, Pad-Kopf kleiner, stärkerer Hover, schmales Pad`

**Description:**
```
- Erinnerung: Meldung oben im Pad, solange es offen ist („Erinnerung“
  bzw. „Verpasst“, Öffnen, ✕), je Zeitpunkt nur einmal; Mitteilung des
  Systems nur nach Erlaubnis; Erinnerung in der Notizliste; Hilfe
- Menü „Wann?“: Esc schließt nur das Menü (nicht die Note), Enter im
  Datumsfeld öffnet es nicht wieder, Klick außerhalb schließt und
  übernimmt das Datum
- Pad-Kopf: Knöpfe 15 % kleiner, Hover deutlich stärker
- Hover der Bedienelemente in der Note wie bei Wann/Wo
- Schmales Pad: Kopf läuft nicht über, Entwurfsleiste einzeilig
- Lastenheft F-215, Übergabe V73
- Tests 378 grün
```
