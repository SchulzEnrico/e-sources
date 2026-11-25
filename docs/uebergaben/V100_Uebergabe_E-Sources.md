# Übergabe V100 → V101 E-Sources

Stand: 25.11.2026 · Chat V100 · Nächster Chat: **V101 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V101 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 Schritt 10** („Gebaut V100“) und **F-220**. Entscheidungs-Docs: V98 „F-206 V98 – Projekte: Datenmodell …“ (https://claude.ai/artifact/7H8PyejdbccEeJzj3SrKXF) – **K1–K8 gelten** (Dauer in Arbeitstagen, je Vorgang automatisch/manuell, Stichtag nur als roter Hinweis, ein Basisplan am Projekt, PSP-Ordnung `order`, Kalender Mo–Fr); V96 (https://claude.ai/artifact/B8bKXzxLhqACZrJ2T1gmgE) – alle Vorschläge gelten; **neu V100: F-220 „Cockpit-Rad: Reihenfolge nach Nutzung und fest belegbar“** (https://claude.ai/artifact/JmywyHycJbBYnG8tfcccs5, PDF `docs/Arbeitspakete/F-220_V100_Cockpit-Rad_Nutzung.pdf`) – **R1–R7 gelten** (Enrico: „Wir folgen deinen Vorschlägen“), Bau **nach dem Gantt**. Leitlinien: **Trello** für Karte und Board, **IPMA ICB4** und **MS Project / iTaskX** für den ganzen Bereich Projekte, Design und Anordnung an unsere Anwendung angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V100_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V100 passiert ist

`npx tsc --noEmit -p .` sauber. Tests mit `vitest-ersatz.js` (Vorlage `docs/uebergaben/vitest-ersatz.js` nach `$HOME/vt2/node_modules/vitest/index.js`): workspace **480** (+10), persons 16, stage 4, noteSources 1 – alle grün. **Enrico bitte `npm test` in `web/`.** Im eingebauten Browser angesehen (`localhost:2910/?test=voll`, 1440 × 900): ⚙ › Beispielprojekt anlegen, Projektliste (1560 h, 39 Vorgänge, 9 Meilensteine), Rad „Ansicht“ → PSP, Codes CG-1.1 … CG-1.6.4 wie im Report, Alt+↓ („Jetzt CG-1.1.2.“), Alt+Umschalt+→ („Jetzt CG-1.1.1.1.“), F2 springt in die Dauer – alles ging.

1. **Dateiformat 10** (K1–K8): `Note.duration` (ganze Arbeitstage), `Note.manual`; `Project.baseline` (`ProjectBaseline`, `BaselineTask`) und `Project.order`; Parser `parseBaseline`, `parseOrder`, `cleanProjectRefs` (noteObjects.ts, storage.ts); `FILE_VERSION = 10`.
2. **`workspace/schedule.ts`**: Kalender Mo–Fr (K7), Dauer mit Herkunft (K1), `isManual` (K2), `parseDurationInput`, `setTaskPlan`.
3. **`workspace/psp.ts`**: `pspTree`, `pspRows`, `findPsp`, `ordered`, `pspSegment`, `withPrefix`, `movePsp`, `indentPsp`, `outdentPsp`, `addPspTask`.
4. **`components/ProjectPsp.tsx`**: PSP-Ansicht im Projekt-Modus; Rad „Ansicht“ Steckbrief · PSP im Kopf der Projektliste (`ProjectCockpit.tsx`, je Gerät gemerkt).
5. **Beispielprojekt „ColorGentlemen“** (`workspace/sampleProject.ts`, ⚙-Menü) aus Enricos Projektreport – siehe Lastenheft.
6. Symbol `psp`, Hilfe „PSP (Projektstrukturplan)“, Begriffe, Texte `PSP_TEXT`, `SAMPLE_TEXT`, CSS „V100“ am Ende von `App.css`.
7. **F-220 neu** (Wunsch Enrico mitten im Chat): Entscheidungs-Doc, alle Vorschläge gelten, Lastenheft-Eintrag und Reihenfolge Punkt 35.

## Nächste Schritte

1. **Gantt** (Ansicht „Gantt“ im Rad „Ansicht“): Logik zuerst in `schedule.ts` – Vorwärts-/Rückwärtsrechnung über `after` (EA, AA, EE, AE mit `lag` in Arbeitstagen), automatisch nie vor „nicht beginnen vor“, manuell = eigene Termine (`notBefore` + Dauer), Sammelvorgänge aus Kindern, Puffer und **kritischer Pfad**, Stichtag-Hinweis K3 (gerechnetes Ende nach „fällig am“ → roter Hinweis am Ort, nichts verschieben). Mit ColorGentlemen gegenprüfen (Report Abb. 13: kritischer Pfad; Abweichung durch fehlende Feiertage erwartet). Oberfläche wie MS Project/iTaskX: links PSP-Spalten (Code, Name, Dauer, Anfang, Ende, Vorgänger), rechts Zeitachse mit Balken (Sammel-, Standardvorgang, Meilenstein ◆, kritisch rot), Pfeile zwischen Balken; Tastatur wie PSP.
2. Dann **Meilensteine** → **Basisplan** („Basisplan speichern“ mit Rückfrage/Rückgängig, grauer Soll-Balken) → **Netzplan** → **F-220** (Räder nach Nutzung) → Ressourcen je Projekt (Task-Limit je Projekt) → Bericht (ICB4, PDF; Vorlage Enricos Report) → Projekt-Desk.
3. Projekt-Modus ausbauen: Filter nach Scope (J12), Quellen am Projekt (Q12), Tour „Projekte“ (F-217).
4. Touren aus V98 im Browser messen (`?test=voll`).
5. Portfolio „Aktuelles“ nachziehen (seit V83; `~/Projects/SchulzEnrico.github.io`, `#aktuell` DE/EN): Notizen, Kanban, Personen/Projektfokus, Main Stage, Touren, Projekte, PSP.
6. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V99 plus:
   - `npm test` in `web/`.
   - ⚙ › „Beispielprojekt „ColorGentlemen“ anlegen“ → Projekt-Modus; danach im ⚙ wieder entfernen (nimmt Vorgänge und Rollen mit).
   - Rad „Ansicht“ Steckbrief · PSP; Wahl bleibt nach Neuladen.
   - PSP: Präfix ändern, Rad „Gliederung“, „+ Vorgang“ (Enter/Umschalt+Enter), Pfeile, ←/→, Alt+↑/↓, Alt+Umschalt+→/←, Enter öffnet die Notiz, F2 → Dauer, Rad „Planung“, Meilenstein an/aus.
   - Ältere Sicherungsdatei laden geht; neue Datei in alter App → „neuere Version“.

## Kleine Punkte (neu in V100)

- Beispielprojekt weist PL-Arbeitspakete „ich“ zu – Fokus-Zeile und Cockpit „Fokus“ zeigen deshalb ab 01.12.2026 viele Stunden. Nach dem Testen im ⚙ entfernen.
- Feiertage: MS Project rechnete im Report mit Feiertagen (146 statt 152 Arbeitstage für 01.12.–30.06.); bei uns Mo–Fr ohne Feiertage (K7). Eigene Kalender/Feiertage später.
- Report-Codes der Meilensteine (CG-M0 …) stehen im Notiztext; im PSP bekommen sie Stellen-Codes (CG-1.7 … CG-1.15), weil sie oben im Baum liegen. Bei Bedarf eigener Code je Eintrag (Feld) oder Meilensteine im PSP ausblenden (MS Project zeigt sie in der Gliederung mit).
- `duration`/`manual` wirken sofort wie Projekt und Quellen, nicht im Entwurf (F-213) – „Verwerfen“ nimmt sie nicht zurück.
- PSP-Meldungen nur am Ort, kein „Rückgängig“ für Verschieben/Stufen (Gegenrichtung per Taste). Ggf. ergänzen.
- Projektliste wird bei PSP-Ansicht schmal (Spalten scrollen waagerecht) – bei Gelegenheit einklappbar machen oder Spalten ausblenden.
- Milestones zeigen in der Spalte Dauer „0 T“ – evtl. „◆“ statt Zahl.
- Neue Vorgänge im PSP legen ihren Titel als H1 in den Text (wie Sheets, `headText`).
- Ansichts-Rad im Kopf der Projektliste ist ein Navigations-Rad im Sinne von F-220 R4 (bekommt dann die Ordnung nach Nutzung).
- Browser-Test: `pg.setViewportSize({width:1440,height:900})` gesetzt; der Testmodus speichert nichts.

## Commit-Text V100

**Summary:** `V100: F-206 Schritt 10 – Dateiformat 10, PSP im Projekt-Modus, Beispielprojekt ColorGentlemen; F-220 entschieden`

**Description:**
```
- Dateiformat 10: Dauer (Arbeitstage) und Planungsart je Vorgang,
  Basisplan und PSP-Ordnung am Projekt; Parser, Abgleich, Datei
- schedule.ts: Kalender Mo–Fr, Dauer nach K1, automatisch/manuell
- psp.ts: PSP als Baum mit Code (Präfix + Stelle, Gliederung
  1.2.3 / A.B.C / A.1.a), verschieben, tiefer/höher stufen, anlegen
- Projekt-Modus: Rad „Ansicht“ Steckbrief · PSP; PSP als Baumtabelle
  mit Tastatur, Vorgangsangaben (Dauer, Planung, Meilenstein)
- Beispielprojekt „ColorGentlemen“ aus dem Projektreport (⚙ anlegen
  und entfernen): 39 Vorgänge mit Vorgängern, Aufwand, Kosten, Rollen
- Hilfe „PSP“, Begriffe, Symbol; Tests (480)
- Lastenheft F-206 Schritt 10, F-220 (Räder nach Nutzung, entschieden),
  Übergabe V100
```
