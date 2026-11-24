# Übergabe V70 → V71 E-Sources

Stand: 24.11.2026 · Chat V70 abgeschlossen · Nächster Chat: **V71 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V71 E-Sources**. Lies diese Übergabedatei, dann `V69_Uebergabe_E-Sources.md` (Links, Kleine Punkte – gelten weiter, soweit hier nicht erledigt) und im Lastenheft **F-215** (Stand V70 dort vollständig). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`). Lies `web/src/components/PadFooter.tsx`, `web/src/workspace/footArc.ts` und in `Pad.tsx` die Stellen „F-215“ und „V70“. Dann „Nächste Schritte“ ab 1.

## Links

- **Entscheidungs-Doc F-215:** https://claude.ai/artifact/A4EFLy6VomNN4v7hZdhoJb – neuer Abschnitt „V70: Name des Knopfs und Knopf im Dock (K5)“. PDF `docs/Arbeitspakete/F-215_Fussleiste_Home-Knopf.pdf` ist veraltet; Claude erzeugt sie selbst neu, sobald Enricos Antworten drin sind (Markdown → `pandoc` → docx → `soffice` → pdf in der VM von device_bash).
- Weitere Links: siehe V69/V68.

## Arbeitsregeln neu (Enrico, V70)

- **Übergabedatei vor cpo:** Claude schreibt die Übergabedatei ins Repo, **bevor** Enrico committet und pusht (cpo). Danach kommt nur noch ein **kurzer Begrüßungstext** für den nächsten Chat (wie Enricos eigene Startnachricht).
- Nach cpo vor der Übergabe nichts mehr im Repo ändern; nötige neue Infos kommen in den Begrüßungstext.

## Was in V70 passiert ist (F-215 Steuerknopf, Schritt 2 fertig)

- **Browser-Prüfung V69:** Tippen, Halten/Ziehen, Randleiste ok; Tastatur ungetestet.
- **Halbkreis rund und symmetrisch, ganz über der Oberkante der Fußleiste** (Enrico: „sieht aus wie ein Ei“; Wahl „5 im Bogen + Mitte“): 180° Zuletzt, 135° Neue Note, 90° Sprachnotiz, 45° Aufgabe, 0° Suche; **Bild & Teilen in der Kreismitte**. Radius 80, Kreismitte 46 px über der Knopfmitte (`ARC_LIFT`). Auswahl per Wischrichtung (`aimItem`, Spielraum `HOLD_DEG`/`HOLD_PX` gegen Flackern); Tastatur Pfeil runter = Mitte, Pfeil hoch = oben.
- **Bewegung** (Enrico: „langsam, geschmeidig, nicht wie ein Rudel Flöhe hüpfen“ – **keine Federn**): Größe stufenlos nach Nähe des Zeigers (`nearness`, wie die Lupe im Dock des Mac), per `--near` direkt am Element im requestAnimationFrame, ohne Neuzeichnen; Einträge gestaffelt aus dem Knopf und zurück. Enrico: fühlt sich gut an.
- **Aussehen:** Einträge auf milchigem Glas in Akzentfarbe. Neue Schriftfarbe auf Akzentflächen **`--on-accent`** (`inkOn` in look.ts: dunkel ab Helligkeit 0,36, sonst weiß; gesetzt in App.tsx und bei Portal-Farben in PanelFrame). Knopf mit dezentem Glanz, Metallring und Spiegelung („zu stark“ → halbiert). Allgemeine Regel `button:hover` (brightness, Leuchtring) für Knopf, Halbkreis und Liste aufgehoben.
- **Schritt 2 Wischen:** kurz (ab 28 px) = Note, weit (ab 110 px) = Sheet, nicht im Kreis (`swipeKind`, `neighbour`); eingravierte Schiene mit Ziel und Legende „kurz: Note · weit: Sheet“, Kerben ‹ › neben dem Knopf; Fläche folgt dem Finger (gedämpft). Tastatur am Knopf: Pfeil = Note, Umschalt+Pfeil = Sheet.
- **Zuletzt genutzt:** `Pad.recent` (letzte 5 Notes/Sheets, gespeichert und abgeglichen; `touchRecent`, `recentIn`, Aktion `padRecent`). Liste über dem Knopf im Stil der Pad-Kopfleiste, Hover wie der aktive Reiter mit Akzentkante links. Enrico: „so bleibt das vorerst“.
- **Pad-Rahmen** („dick wie ein Deckenbalken“): doppelter Akzentring beim aktiven Pad entfernt, Retina-Haarlinie 0,5 px; Innenabstand der Note im Pad 4 px; Pad-Rand 2 px.
- **Doc F-215, offen:** N1 Name (Vorschlag „Steuerknopf“), N2 im Dock gleich (ja), K5a Knopf im Dock (Vorschlag C: gleicher Halbkreis, Anlegen in die zuletzt genutzte Note mit Meldung „Andere Note …“), K5b Ziel ohne Rückfrage, K5c Wischen im Dock.
- **Tests:** in der VM startet vitest nicht, Typprüfung (`cd web && npx tsc --noEmit -p tsconfig.json`) grün. Auf dem Mac vor dem ersten V70-Commit gelaufen, erwartet 373 – Zahl von Enrico bestätigen lassen.

## Nächste Schritte

1. Enrico: Testzahl nennen; Tastatur am Knopf und im Halbkreis im Browser prüfen; Schiene beim Wischen und Kerben ansehen.
2. Antworten N1/N2/K5 im Doc abwarten → Name in `terms.ts`/`help.ts`, PDF neu erzeugen.
3. **F-215 Schritt 3 Sprachnotiz:** nur lokal (`processLocally`, heute nur Chrome/Edge am Rechner), sonst Hinweis auf Diktat des Systems; Alt+M, Feststellen ↑, Abbrechen ←, Ansagen `aria-live`, Einstellung „Spracherkennung“; Ziel wie K2 (Mikrofon = geöffnete Note, sonst neue). Danach Schritt 4 Aufgabe + Suche, Schritt 5 Bild & Teilen (`html-to-image` installiert Enrico), dann Dock (K5).
4. Danach weiter laut V68: F-214 Grundsatz-Doc, Umstieg P5 usw. (Funktion vor Design).

## Kleine Punkte (neu in V70)

- Halbkreis reicht bis ca. 150 px über die Knopfmitte – in flachen Pads (unter ca. 200 px) wird er oben abgeschnitten (`.pad { overflow: hidden }`).
- `padRecent` schreibt bei jedem Öffnen einer Note bzw. Sheet-Wechsel in den Workspace → Speichern und Abgleich jedes Mal; beobachten.
- In Sheets ohne Notizblock wechselt auch kurzes Wischen das Sheet.
- Liste „Zuletzt genutzt“ hat ein `title` mit Tastaturhinweis (großer Tooltip) – evtl. als sichtbare Fußzeile.
- Hilfe/Begriffe (`help.ts`) für Steuerknopf, Halbkreis, Wischen, Zuletzt genutzt fehlen.

## Commit-Text (Übergabe)

**Summary:** `V70: Übergabe`

**Description:**
```
- Übergabedatei V70 (Stand F-215 Schritt 2, offene Fragen N1/N2/K5,
  neue Arbeitsregel: Übergabe vor cpo)
```
