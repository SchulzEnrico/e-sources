# Übergabe V103 → V104 E-Sources

Stand: 25.11.2026 · Chat V103 · Nächster Chat: **V104 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V104 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-221** (Feedback, **Stand V103: Bau 1–5 gebaut, Prüfung offen**), **F-222** (Nutzwertanalyse, entschieden V102 N1–N12, **Datenmodell + Rechenkerne V103**) und **F-223** (Pads je Modus, Dock eingeklappt – neu V103). Entscheidungs-Doc F-222: https://claude.ai/artifact/LJyPmsG7JhmEaCxqAavh1N (PDF `docs/Arbeitspakete/F-222_V102_Nutzwertanalyse.pdf`), F-221: https://claude.ai/artifact/1M5KSM6VeL87nW12zuBPQj. **Termin Fr 04.12.2026** (Enricos Testphase ab 07.12.). Weiter gelten V98-Doc (K1–K8), V96-Doc, F-220 (R1–R7). Leitlinien: **Trello** für Karte und Board, **IPMA ICB4** und **MS Project / iTaskX** für Projekte, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V103_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V103 passiert ist

`npx tsc --noEmit -p .` sauber. Tests (`vitest-ersatz.js` → `$HOME/vt2/node_modules/vitest/index.js`, Skript `$HOME/vt2/run.sh` neu anlegen wie in V61): workspace **496** (+4), persons 16, stage 4, noteSources 1 – alle grün. **Enrico bitte `npm test` in `web/`.** Im eingebauten Browser geprüft (`localhost:2910/?test=voll`, 1440 × 900 und schmal): Modi wechseln mit Notizen-Pads, Feedback ausarbeiten, Cockpit „Feedback“, Bearbeitung an/aus, Esc – keine Fehler in der Konsole (die 500er im Protokoll stammten vom Neuladen mitten im Einbau).

1. **F-222 Datenmodell (N11)** `workspace/decisions.ts` + Typen in `types.ts` (`Decision`, `DecisionCriterion`, `DecisionOption`, `DecisionScore`, `DecisionPairs`, `DecisionLink`, `DecisionMark`), `Workspace.decisions`, Lesen in `storage.ts` (Projekt-Bezug nur auf vorhandene Projekte). Rechenkerne: `pairWeights` (2 · 1 · 0, fehlende Paare = gleich, Rundungsrest an das größte), `normalizeWeights` („auf 100 % verteilen“), `weightSum`, `ranking` (Nutzwert = Σ Gewicht % × Bewertung, Muss-Kriterien zählen nicht, „scheidet aus“ zuletzt, gleicher Rang bei Gleichstand), `winner`, `needsWhy`. **Format bleibt 11.**
2. **F-221 Bau 3 – Ausarbeiten** `components/FeedbackCard.tsx`: `<dialog class="fbc">` mittig (wie Kanban-Karte S1), Titel, Räder Art · Zustand · Schweregrad („offen“ = nicht eingeschätzt), „Noch offen: …“ (Knöpfe springen ins Feld), Gruppen Anlass & Kontext · Lösungsansatz · Relevanz · Hypothesen je Art (`SHOWN`), „Alle Felder zeigen“, Bilder bis 6 (Datei, Strg/⌘+V; Bildspeicher wie Notizbilder), Verworfen fragt am Ort nach Grund, „Gespeichert.“ am Feld, Felder speichern beim Verlassen und beim Schließen (Esc/✕/daneben/„Fertig“). **Enrico: Bezüge, Vermerke zur Weiterverarbeitung, „Behoben in“, „Vermerk hinzufügen“ nur auf unserer Seite** → nur mit Schalter **„Bearbeitung“** (Cockpit „Feedback“, localStorage `esource.feedback.triage`, ab Werk aus). Esc schließt nur die Karte, nicht das Cockpit.
3. **F-221 Bau 4 – Cockpit „Feedback“** `components/FeedbackCockpit.tsx`, Eintrag im Cockpit-Rad (Overview `mode 'feedback'`, `startFeedback`): Board 5 Spalten, Filter-Räder Art/Schweregrad, Suche, Karten mit Art, Schweregrad-Farbe am Rand, F-Nummern, Bilder, „n offen“; Ziehen oder Alt/⌥+←/→ verschiebt, Pfeile wandern, Enter öffnet, Entf löscht – Meldung mit Rückgängig **in der Spalte**. „Als Datei speichern“ (Markdown + JSON, „nur Neue“) als Download. „Alle Meldungen …“ im Feedback-Fenster (`onAll`), Hilfe-Lauf `feedbackCockpit`.
4. **F-221 Bau 5**: Hilfe „Feedback ausarbeiten“ und „Cockpit „Feedback““, Begriffe `TERMS.severity`, `TERMS.problem`, Schritt „Feedback“ in der Start-Tour. `APP_VERSION = 'V103'`.
5. **F-223 (Wunsch Enrico, neu)**: `Pad.notes` – im Notizen-Modus neu geöffnete Pads erscheinen nicht im Desk-/Projekt-Modus (`deskPadsOn`); Erkennung per Effekt in `App.tsx` (`padSnap`: neue Pads im Notizen-Modus → `padNotes on`; im Desk neu, Sheet gewechselt oder nach oben geholt → `padNotes off`). ⋮ im Pad: „Nur im Notizen-Modus zeigen“ (auch für alte Pads). `dockPad` nimmt den Vermerk weg, `dockAll` lässt Notizen-Pads stehen. **Dock**: `folded` fehlt = eingeklappt (`dockOf`), gespeichert wird nur `folded: false`; ins Dock legen klappt nicht mehr auf; Einklappen beim Start und bei Wechsel von Desk/Modus.
6. Lastenheft: F-221 Stand V103, F-222 Stand V103, F-223 neu (Liste Nr. 38 und Detail).

## Nächste Schritte

1. **Rest bis Fr 04.12.**: eigene **Tour „Feedback“** (F-217; Cockpit öffnen wie `startCockpitTour`), Hilfe-Suche prüfen; Portfolio „Aktuelles“ nachziehen (seit V83: Notizen, Kanban, Personen/Projektfokus, Main Stage, Touren, Projekte, PSP, Gantt, Feedback).
2. **F-222 Oberfläche** nach Doc-Bauplan (N9: Rad Kriterien · Paarvergleich · Bewertung · Ergebnis, Tabelle wie Gantt, Dreieck mit Klartext-Frage, Ergebnis live; N12 Erklären, „Beispiel ansehen“ Wohnung/Malerbetrieb; N8 Markdown + CSV). Reducer-Aktionen `dc…` fehlen noch.
3. Dann Schritt 10: **Meilensteine** → **Basisplan** → **Netzplan** → **F-220** (Format-Felder `wheels` stehen) → Ressourcen je Projekt → Bericht → Projekt-Desk.
4. Ideen zu F-223, falls Enrico es will: Dock zusätzlich einklappen, wenn man daneben klickt (wie eine Schublade).
5. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V102 plus:
   - `npm test` in `web/`.
   - Notizen-Modus: neues Pad anlegen → zu Desk und Projekte wechseln: Pad nicht da; zurück zu Notizen: Pad da. Im Desk eine Notiz aus so einem Pad per Suche öffnen → Pad erscheint im Desk. ⋮ im Pad (Desk) › „Nur im Notizen-Modus zeigen“ – für deine alten Pads.
   - Dock: beim Start eingeklappt; Pad ins Dock → bleibt eingeklappt; ausklappen, Modus wechseln → wieder eingeklappt.
   - Feedback: Titel, Strg/⌘+Enter → Karte; „Noch offen“-Knöpfe springen; Schweregrad-Rad; Bild per Strg/⌘+V; Zustand Verworfen ohne Grund → rote Meldung; Esc speichert und schließt.
   - Cockpit-Rad › „Feedback“ bzw. „Alle Meldungen …“: Spalten, Ziehen, Alt/⌥+←/→, Entf + Rückgängig in der Spalte, Filter, „Als Datei speichern“ (zwei Downloads) → nach `docs/Feedback/` legen.
   - „Bearbeitung“ an: Karte zeigt Bezüge, Vermerke, „Behoben in“; aus: nicht.
   - Sicherungsdatei exportieren/importieren (Format 11) – Feedback, Pad-Vermerk und Dock bleiben.

## Kleine Punkte (neu in V103)

- Bestehende Pads aus früheren Notizen-Sitzungen haben noch keinen Vermerk – einmal im Desk über ⋮ › „Nur im Notizen-Modus zeigen“.
- Abgleich per Gist bringt Pads anderer Geräte mit Vermerk mit; ein Pad, das während des Abgleichs im Notizen-Modus *neu* hier auftaucht, bekommt den Vermerk ebenfalls (Effekt erkennt „neu“). Für die Testphase in Ordnung, ggf. später beim Anlegen im Reducer setzen.
- `Pad.notes` und `dock.folded: false` sind neu in Format 11 (V102 noch nicht im Test) – keine Versionsänderung.
- Datei-Ablage `docs/Feedback/` steht schon in `.gitignore`.
- Rad „Zustand“ in der Karte: „Verworfen“ zeigt erst das Grund-Feld; ohne Bestätigung bleibt der alte Zustand.
- Test `F-221` nutzt weiter `version: 'V102'` als Beispieldaten – kein Fehler.

## Commit-Text V103

**Summary:** `V103: F-221 Feedback Bau 3–5 – Ausarbeiten, Cockpit „Feedback“, Hilfe; F-222 decisions in Format 11; F-223 Pads je Modus, Dock eingeklappt`

**Description:**
```
- Feedback ausarbeiten: Kartenfenster wie Kanban-Karte mit Art, Zustand,
  Schweregrad, „Noch offen“, Feldern der Problemstellung je Art, Bildern;
  Verworfen fragt nach Grund; Bezüge und Vermerke nur mit „Bearbeitung“
- Cockpit „Feedback“: Board Neu bis Verworfen, Filter, Ziehen und
  Alt/⌥+Pfeil, Löschen mit Rückgängig am Ort, Als Datei speichern (MD+JSON)
- Hilfe, Begriffe Schweregrad/Problemstellung, Schritt in der Start-Tour
- F-222: decisions.ts – Datenmodell in Format 11, Paarvergleich, Nutzwert,
  Rangliste, Muss-Kriterien; Tests
- F-223: Pads aus dem Notizen-Modus nicht mehr im Desk/Projekt-Modus,
  „Nur im Notizen-Modus zeigen“; Dock im Normalzustand eingeklappt
- Lastenheft F-221/F-222/F-223, Übergabe V103; Tests (496)
```
