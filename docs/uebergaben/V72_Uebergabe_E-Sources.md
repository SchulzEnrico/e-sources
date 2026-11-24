# Übergabe V72 → V73 E-Sources

Stand: 24.11.2026 · Chat V72 abgeschlossen (ca. 80 % Füllstand) · Nächster Chat: **V73 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V73 E-Sources**. Lies diese Übergabedatei, dann `V71_Uebergabe_E-Sources.md` (Kleine Punkte – gelten weiter, soweit hier nicht erledigt) und im Lastenheft **F-215** (Abschnitt „V72 (Enrico)“). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`). Lies `web/src/components/RemindChips.tsx`, `web/src/workspace/remind.ts`, `web/src/components/PadFooter.tsx` (Stellen „V72“) und in `NoteTab.tsx` die Stelle „V72“. Dann „Nächste Schritte“ ab 1.

## Links

- **Entscheidungs-Doc V72:** https://claude.ai/artifact/LJT9uA5MXh25hcnpLzcsJm („F-215 V72: Smartphone mit Tastatur und Umschalter Desk/Note Mode“) – alles beantwortet, Abschnitt „Ergebnis der Antworten“. PDF (von Claude selbst erzeugt, Zusammenfassung): `docs/Arbeitspakete/F-215_V72_Smartphone_Desk-Note-Mode.pdf`.
- Doc F-215 (V69–V71): https://claude.ai/artifact/A4EFLy6VomNN4v7hZdhoJb – PDF `F-215_Fussleiste_Home-Knopf.pdf` weiter veraltet.
- PDF erzeugen: eigenes kurzes Markdown → `pandoc` → docx → `soffice --headless --convert-to pdf` in der VM von device_bash (Export des Docs als Base64 ist zu groß für den Chat).

## Was in V72 passiert ist

- **Prüfung V71 (Enrico):** Enter im Titel ✓, ↓ fett ✓ („aber viel zu weit ziehen“), Pfeil-Aufbau ✓. iPhone erst, wenn die Anwendung schreibfähig ist.
- **Wischen kürzer:** `SWIPE_PX` 14 (vorher 28), `CHEV_FULL` 48 (vorher 110), `MOVE_PX` 6.
- **Notizliste Clay-Look** (Wunsch Enrico): Radius 7 px (16 „viel zu stark“, 4 „doch etwas mehr“), volle Breite ohne Seitenrand (links/rechts gleich). **„Neue Note“ Neumorphism** (Farbe der Fläche, Licht oben links, Schatten unten rechts, Symbol in Akzentfarbe). Pad-Kopf: „+ Sheet“, „⋮“, „✕“ ebenfalls Clay, Abstände im Kopf gleichmäßiger (gap 8 px, Innenabstand 5/8 px). Bedienelemente in der Note (Werkzeugleiste, Löschen, Speichern/Verwerfen/Schließen) Neumorphism, Felder (Zustand, Datum, Grund) eingesenkt; gewähltes Werkzeug eingesenkt in Akzentfarbe. Von Enrico noch nicht angesehen.
- **Entscheidungen** (Doc V72): Telefon A2 + B + C; Umschalter Desk/Note Mode in der Kopfzeile bei den Layout-Ansichten; Erinnerung Variante A. Details im Lastenheft F-215 „V72 (Enrico)“.
- **Gebaut – Erinnerung:** `Note.place` (types, parse in noteObjects.ts), `remind` und `place` als Entwurfsfelder (`DRAFT_FIELDS`, `norm` vergleicht remind als Text, `saveDraft`, `parseDraft`). Vorhandenes `Note.remind` (`{at, repeat?, snooze?}`, V65) ist „Erinnern am“. `remind.ts`: `quickPicks`, `remindLabel`, `toLocalInput`/`fromLocalInput`, `recentPlaces`. `RemindChips.tsx` über dem Editor in NoteTab (immer sichtbar): „Wann?“ → Schnellwahlen + „Datum wählen …“ (datetime-local, `showPicker`), „Wo?“ → Textfeld mit datalist; ✕ entfernt; Ansage aria-live. Texte `REMIND_TEXT` in terms.ts. ↓ ohne offene Note = `tpl-remind` (H1 + Text).
- **Gebaut – B:** Knopf nimmt den Fokus nicht (`preventDefault` bei pointerdown/mousedown). **Am Rechner nicht geprüft, iPhone offen.**
- **Tests:** 376 grün in der VM (+4: Entwurf remind/place, Lesen, Schnellwahlen, Anzeige). Auf dem Mac bestätigen lassen.

## Nächste Schritte

1. **Enrico:** im Browser prüfen – Clay-Liste (Radius, Abstände), Pad-Kopf, „Neue Note“ und Bedienelemente der Note im Neumorphism-Look, Chips „Wann?“/„Wo?“ (Schnellwahl, Datum wählen, ✕, Ort mit Vorschlägen), ↓ wischen ohne offene Note, Knopf antippen während des Schreibens (Schreibmarke bleibt?). Testzahl nennen.
2. **Erinnerung fertig bauen:** Prüfung im Pad (Intervall, nur offene Pads), Meldung am Pad mit „Öffnen“ (am Ort, F-214), verpasste beim Öffnen („Verpasst: …“), Systemmitteilung erst nach Erlaubnis; Hilfe-Einträge (help.ts + `HELP_ICON`). Chips evtl. erst zeigen, wenn gesetzt oder Erinnerung angelegt (beobachten, ob sie stören).
3. **Telefon A2 + C:** `visualViewport` → Knopf direkt über der Tastatur, ohne Fußleiste, Deckkraft-Einstellung (10–100 %, 25 %), waagerecht verschiebbar (Doppeltippen + halten, Regler), je Gerät; Vollbild unter 600 px; Tastatur sofort nur bei neuer Note (T5 – prüfen, ob `autoFocus` in NoteTab beim Öffnen bestehender leerer Notes greift).
4. **Umschalter Desk | Notes** in der Kopfzeile bei den Layout-Ansichten (je Desk; Telefon automatisch Note Mode, Pad füllt den Desk; groß = Board laut F-206).
5. Schieberegler H1–H3 am Knopf „Überschrift“; danach F-215 Schritt 3 Sprachnotiz usw. (siehe V71 Punkt 5).

## Kleine Punkte (neu in V72)

- RemindChips liegen über der Leiste des Editors, nicht direkt unter dem Titel (Titel ist Teil des Textes) – Enrico fragen, ob ok.
- `recentPlaces` läuft bei jedem Zeichnen von NoteTab über alle Notes – bei vielen Notes ggf. merken.
- Popover „Wann?“ schließt nicht bei Klick außerhalb (nur Esc/Auswahl).
- Im Entwurfsmodus landen Wann/Wo im Entwurf (erst „Speichern“ übernimmt).

## Commit-Text V72

**Summary:** `V72: Erinnerung (Wann/Wo), kürzere Wischwege, Clay und Neumorphism im Pad, Entscheidungen Smartphone und Desk/Note Mode`

**Description:**
```
- Erinnerung: Chips „Wann?“ (Schnellwahlen, Datum wählen) und „Wo?“
  (Ort mit Vorschlägen) über der Note; Note.place, remind/place im
  Entwurf; ↓ ohne offene Note legt eine Erinnerung an
- Wischen am Steuerknopf mit kürzeren Wegen (14 px, Pfeil bei 48 px)
- Steuerknopf nimmt dem Schreibfeld nicht mehr den Fokus
- Notizliste und Knöpfe im Pad-Kopf im Clay-Look, Abstände im Pad-Kopf
- „Neue Note“ und Bedienelemente der Note im Neumorphism-Look
- Entscheidungs-Doc V72 (Smartphone A2+B+C, Umschalter Desk/Note
  Mode) als PDF, Lastenheft F-215, Übergabe V72
- Tests 376 grün
```
