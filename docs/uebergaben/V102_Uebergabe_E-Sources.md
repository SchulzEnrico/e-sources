# Übergabe V102 → V103 E-Sources

Stand: 25.11.2026 · Chat V102 · Nächster Chat: **V103 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V103 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-221** (Feedback, entschieden V101, FB1–FB12; **Stand V102: Bau 1–2 gebaut**) und **F-222** (Nutzwertanalyse, **entschieden V102, N1–N12 gelten** – Enrico: „so, dass die Funktion am besten und intuitivsten gewährleistet ist“). Entscheidungs-Doc F-221: https://claude.ai/artifact/1M5KSM6VeL87nW12zuBPQj · Entscheidungs-Doc F-222: https://claude.ai/artifact/LJyPmsG7JhmEaCxqAavh1N (PDF `docs/Arbeitspakete/F-222_V102_Nutzwertanalyse.pdf`). **Termin: F-221 Bau 3–5 fertig bis Fr 04.12.2026** (Enricos Testphase ab 07.12.). Weiter gelten V98-Doc (K1–K8), V96-Doc, F-220 (R1–R7). Leitlinien: **Trello** für Karte und Board, **IPMA ICB4** und **MS Project / iTaskX** für Projekte, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V102_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V102 passiert ist

`npx tsc --noEmit -p .` sauber. Tests mit `vitest-ersatz.js` (nach `$HOME/vt2/node_modules/vitest/index.js`): workspace **492** (+7), persons 16, stage 4, noteSources 1 – alle grün. **Enrico bitte `npm test` in `web/`.** Im eingebauten Browser angesehen (`localhost:2910/?test=voll`, 1440 × 900): Knopf „Feedback“, leerer Titel → Meldung am Ort, Speichern → „gespeichert“ + Rückgängig + 1–5, Abzeichen „1“, Alt/⌥+F, Rad „Art“, „Ähnlich schon gemeldet“, Pad-⋮ › „Feedback …“ öffnet direkt unter dem ⋮, Suche „Fehler melden“ findet den Hilfe-Eintrag – keine Fehler in der Konsole.

1. **F-222 Entscheidungs-Doc** (Claude Doc + PDF): Vorlage `.numbers` selbst ausgelesen (Blatt 1 vereinfachte NWA; Blatt 2 „Paarweiser Vergleich (Schritt 1)“ 1/0 mit Prüfsumme → „Nutzwertanalyse (Schritt 2)“; Diagramme). Fragen **N1–N12**, per Kommentar von Enrico **entschieden** (N3 ab 2 × 2, N9 intuitiv und übersichtlich, N12 Erklären im Werkzeug neu); Lastenheft F-222 entschieden.
2. **F-221 Bau 1 – Logik** `workspace/feedback.ts`: `addFeedback` (Stufe 1), `editFeedback` (Stufe 2, leere Felder fallen weg, „behoben in Vxx“ als Vermerk), `setFeedbackState` (Spur „alt → neu: Grund“), `addMark` (Vermerk/Entscheidung/Bezug), `removeFeedback`/`undoRemoveFeedback`, `missingOf` („noch offen“ je Art), `similarFeedback`, `feedbackBoard` + Filter (Art, Schweregrad, Suche; blockiert zuerst), `newCount`, `askEase`/`setAskEase` (FB12), `envOf`/`browserOf` (FB6), `parseRef(s)` (F-/NF-Nummern), Ausgabe `feedbackFileMarkdown` (Gliederung der Problemstellung: Anlass & Kontext, Hintergrund, Lösungsansatz, Relevanz, Hypothesen, Vermerke zur Weiterverarbeitung) + `feedbackFileJson` (wahlweise nur Neue) + `feedbackFileName`, `APP_VERSION = 'V102'` (**bei jedem Chat hochzählen**).
3. **Dateiformat 11** (`transfer.ts`): `feedback`, `feedbackPrefs`, und für **F-220 R5** schon `wheels` (je Rad `pinned`, `hidden`, `auto: false`, `order`) – Typen `Feedback*`, `WheelPrefs` in `types.ts`, Lesen in `storage.ts` (`parseFeedback`, `parseFeedbackPrefs`, `parseWheels`). Die Zählung der Nutzung (R1) gehört **nicht** in die Datei (je Gerät, localStorage).
4. **F-221 Bau 2 – Schnell erfassen** `components/FeedbackQuick.tsx`: `<dialog>` am Anker (`placeAt`: unter dem Knopf, rechtsbündig, sonst darüber), Rad „Art“ (Fehler · Wunsch · Frage · Lob, mit Erklärung), Titel (Enter speichert, Strg/⌘+Enter = „Speichern und ausarbeiten …“, Knopf nur sichtbar, wenn `onElaborate` übergeben wird → **Bau 3**), „Ähnlich schon gemeldet“, Ort und Gerät sichtbar mit Datenschutz-Satz; danach Meldung am Ort mit Rückgängig und „War das Melden einfach?“ 1–5 + „Nicht mehr fragen“ (schließt nach 8 s Ruhe). Ort: `domPlace` (aria-Namen der umgebenden Bereiche/Menüs) bzw. aus der Kopfleiste `mainView` (erster sichtbarer Bereich im `main`), Modus, Desk.
5. **App.tsx**: Knopf `.tb-fb` neben „?“ mit Abzeichen (neue Meldungen), Alt/⌥+F, Hilfe-Lauf `run: 'feedback'` (Suche), Ereignis `FEEDBACK_EVENT` (`askFeedback()` aus ⋮ in **PanelFrame** „Portal-Optionen“ und **Pad** „Pad-Optionen“; Anker = Knopf des offenen Menüs). Aktionen in `useWorkspace.ts`: `fbAdd`, `fbEdit`, `fbState`, `fbMark`, `fbRemove`, `fbRestore`, `fbAskEase`.
6. Texte `FEEDBACK_TEXT`, Begriff `TERMS.feedback`, Hilfe „Feedback“ (Symbol `feedback`, neu in `icons.ts`), CSS „V102“ am Ende von `App.css`. `imageRefs` (notes.ts) zählt Feedback-Bilder mit, damit sie beim Aufräumen nicht wegfallen.

## Nächste Schritte

1. **F-221 Bau 3 – Ausarbeiten** (Kartenfenster wie Kanban-Karte/Notiz, NF-08): alle Felder der Problemstellung nach Art (Fehler: Schritte, erwartet, tatsächlich; Wunsch: Ziele/Nicht-Ziele, betroffen), Schweregrad als Rad (Bedeutungsreihenfolge, nicht nach Nutzung), Folgen, Vermutung, Umgehung, Bezug F-Nummer (`parseRefs`, Unsinn → Meldung am Ort), ähnliche Meldungen verknüpfen, **Bild** wie Notizbilder (`imageStore`, `PICS_MAX` 6), „noch offen: …“ aus `missingOf`, Vermerke + Spur, Zustand. Dann in `FeedbackQuick` `onElaborate` übergeben.
2. **Bau 4 – Cockpit „Feedback“**: Board wie Kanban (Spalten Neu · Gesichtet · Geplant · Erledigt · Verworfen aus `feedbackBoard`), Filter Art/Schweregrad/Suche, Karte öffnet das Kartenfenster, Karten verschieben = `fbState` (Verworfen fragt nach Grund), Löschen mit Rückgängig, **„Als Datei speichern“** (Markdown + JSON, „nur Neue“) – Ablage `docs/Feedback/` (gitignore). Eintrag im Cockpit-Rad (Achtung F-220: Touren über Id).
3. **Bau 5** – Hilfe ergänzen (Cockpit, Ausarbeiten), Begriffe (Schweregrad, Problemstellung), Tour „Feedback“ (F-217), Prüfliste. **Termin Fr 04.12.**
4. **F-222** (entschieden): **gleich in V103 mit Bau 1 von F-221 zusammen** `Workspace.decisions` (Typ + `parseDecisions` + Test) noch in **Format 11** aufnehmen (N11), damit vor der Testphase nur ein Formatwechsel; Bau der Funktion nach F-221 (Doc-Bauplan 1–5).
5. Dann Schritt 10: **Meilensteine** → **Basisplan** → **Netzplan** → **F-220** (Format-Felder `wheels` stehen schon) → Ressourcen je Projekt → Bericht → Projekt-Desk.
6. Portfolio „Aktuelles“ nachziehen (seit V83): Notizen, Kanban, Personen/Projektfokus, Main Stage, Touren, Projekte, PSP, Gantt, Feedback.
7. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V101 plus:
   - `npm test` in `web/`.
   - Knopf „Feedback“ oben neben „?“: Fenster direkt darunter; ohne Titel speichern → rote Meldung am Ort; Art am Rad wechseln (Erklärung daneben ändert sich); Enter speichert; „Rückgängig“; 1–5 und „Nicht mehr fragen“ (danach keine Frage mehr).
   - Zahl am Knopf = neue Meldungen.
   - Alt/⌥+F überall, auch im Notizen- und Projekt-Modus; ⋮ im Portal und im Pad › „Feedback …“ öffnet am ⋮.
   - „Ort und Gerät“ nennt Modus, Ansicht, Desk, Version, Gerät, Browser, Bildschirm – nichts aus Inhalten.
   - Ähnlichen Titel eingeben → „Ähnlich schon gemeldet“.
   - Sicherungsdatei exportieren/importieren (Format 11) – Feedback bleibt erhalten; Abgleich per Gist.

## Kleine Punkte (neu in V102)

- `APP_VERSION` in `feedback.ts` steht von Hand auf „V102“ – bei jedem Chat mitzählen (oder später aus dem Build holen).
- Fragen-Vorschläge in der Suche („Wie melde ich einen Fehler?“) öffnen die Hilfe beim Eintrag „Feedback“ (dort „Ausführen“) – das ist das bestehende Verhalten der Suche, kein Fehler.
- Browser-Test: Alt-Kürzel als `p.keyboard.press('Alt+f')` (nicht `Alt+KeyF`); das Fenster schließt nach 8 s Ruhe von selbst – im Test direkt nach dem Speichern weiterklicken.
- Die Meldung nach dem Speichern bleibt im Feedback-Fenster stehen (am Ort, F-214), nicht unten am Rand.
- Feedback-Bilder liegen wie Notizbilder nur auf dem Gerät; im Markdown steht nur die Anzahl.
- `similarFeedback` vergleicht nur Titelwörter ≥ 4 Zeichen (mind. die Hälfte gleich) – reicht für die Testphase, ggf. später feiner.
- Im Hilfe-Text „Feedback“ ist das Cockpit „Feedback“ schon erwähnt – kommt mit Bau 4.

## Commit-Text V102

**Summary:** `V102: F-221 Feedback Bau 1–2 – Logik, Dateiformat 11 und Schnell erfassen am Ort; F-222 Nutzwertanalyse entschieden`

**Description:**
```
- feedback.ts: Meldungen (Fehler, Wunsch, Frage, Lob) als eigenes Objekt
  mit Problemstellung in zwei Stufen, Zustand Neu/Gesichtet/Geplant/
  Erledigt/Verworfen, Vermerke und Spur, „behoben in Vxx“, ähnliche
  Meldungen, Board mit Filter, Ausgabe Markdown + JSON (nur Neue)
- Dateiformat 11: feedback, feedbackPrefs und wheels (F-220 R5:
  angeheftet, ausgeblendet, automatisch ordnen)
- Schnell erfassen: Knopf „Feedback“ neben „?“ mit Zahl neuer Meldungen,
  Alt/⌥+F, „Feedback …“ im ⋮ von Portal und Pad, Suche; Fenster am Ort,
  Rad „Art“, Ort und Gerät automatisch (nichts aus Inhalten),
  Rückgängig, „War das Melden einfach?“ 1–5 (abschaltbar)
- Hilfe „Feedback“, Begriff, Symbol; Tests (492)
- Lastenheft F-221 Stand, F-222 entschieden (N1–N12), Übergabe V102
```
