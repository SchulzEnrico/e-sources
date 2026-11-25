# Übergabe V97 → V98 E-Sources

Stand: 25.11.2026 · Chat V97 abgeschlossen · Nächster Chat: **V98 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V98 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 Schritt 9** („Gebaut V97“), **F-207** und **F-217**. Entscheidungs-Doc Schritt 9/10: „F-206 V96 – Main Stage, Library-Umschalter (Schritt 9) und Projekt-Desk oder Projekt-Modus (Schritt 10)“ (https://claude.ai/artifact/B8bKXzxLhqACZrJ2T1gmgE, PDF `docs/Arbeitspakete/F-206_V96_MainStage_Library_ProjektModus.pdf`) – **alle Vorschläge gelten** (Enrico V96). Leitlinien: **Trello** für Karte und Board, **IPMA ICB4** und **MS Project / iTaskX** für den ganzen Bereich Projekte, Design und Anordnung an unsere Anwendung angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V97_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V97 passiert ist

`npx tsc --noEmit -p .` sauber. Tests mit `vitest-ersatz.js`: workspace 463, persons 16, stage 4 (+1), noteSources 1 – alle grün. **Enrico bitte `npm test` in `web/`.** Im Browser noch nicht angesehen (Prüfung gesammelt).

**F-206 Schritt 9 komplett gebaut (Bau 2–6), F-207 Main Stage Stufe 1:**

1. **Bau 2 – Scheinwerfer** (`PanelFrame.tsx`, App `stageOf(slot)`): Knopf im Portal-Kopf vor der Kategorie (Symbol `spotlight`, neu in `icons.ts`); als Stage mit Wort „Stage“ in Akzentfarbe, sonst nur bei Hover/Fokus. ⋮ „Auf die Main Stage“ (Schalter). Lichtkegel oben im Portal (`win__cone`). Meldung am Ort unter dem Scheinwerfer mit „Rückgängig“. Cockpit „Portale“: **Taste S** auf Kachel und Portal-Zeile (auch andere Desks), Scheinwerfer an der Kachel, Meldung unter dem Radar. Nur Desk-Modus.
2. **Bau 3 – „Main Stage …“** (`components/StagePanel.tsx`): Klick auf den Scheinwerfer der Stage bzw. ⋮ „Main Stage …“. Rad „Im Layout“ Frei · Fest, Mindestgröße B × H px („Heutige Größe nehmen“, „Ohne Mindestgröße“), „Auf allen Desks“ gesperrt mit Grund (Stufe 2), „Von der Main Stage nehmen“. **Sperren (M6) zentral in App:** `fixedStage`, `stageLockOf` in `startDrag`, Drop in die Mitte, Tauschen, `moveTo`, `toWindow`, `closePortal`; ✕ im Portal blass mit Grund am Ort. Mindestgröße: `stageOk`/`layoutTo` für Kanten ziehen, Tastatur, Mausrad, Größen-Voreinstellungen, Radar.
3. **Bau 4 – Pads/Dock/Lageplan:** `stageRect`, `besideStage` in App (Platz neuer Pads, Lageplan), Lageplan sperrt Plätze über der Stage (`padPlanBlocked`); Pad (`Pad.tsx`, Prop `stage`): alter Platz über der Stage wird daneben gezeigt, Ziehen darüber rot gestrichelt „hier nicht“ und springt zurück, Alt+Pfeil springt über die Stage. **Dock (M5):** `keepStageWidth` in `stage.ts` (Test) – im `shownView` behält die Stage ihre px-Breite, Zustand `dockKeep`. Verwaiste Stage wird gelöst (Effekt in App). **Q5:** Quelle aus Notiz öffnet im vorderen Portal der Stage.
4. **Bau 5 – Library-Rad „Sources · Notizen“** (`components/LibraryNotes.tsx`, Texte `LIB_TEXT`): oben in der Portal-Library (`Bookmarks.tsx`) und im Cockpit „Library“ (`SourceCockpit.tsx`, alte Liste jetzt `SourceList`). Portal = `notesOfPanel` (Tabs + zugeordnete Sources) mit „Neue Notiz zu dieser Seite“, Cockpit = alle ohne Archiv. Filter, Pfeile, Enter öffnet im Pad. Wahl je Portal/Cockpit je Gerät (`esource.libraryMode.v1`).
5. **Bau 6 – Hilfe** „Main Stage“ und „Library: Sources · Notizen“ (Symbole in `HELP_ICON`), `TERMS.mainStage`, `STAGE_TEXT`.
6. Lastenheft: F-206 Schritt 9 „Gebaut V97“, F-207 auf ◐, Zählzeile ergänzt.

## Nächste Schritte

1. **F-217 Touren prüfen** (`workspace/tour.ts`, 518 Zeilen; `components/Tour.tsx`): alle Touren (Start, Cockpit, Import, Design, Farben, Verhalten von Sources, Entwickler, Abgleich) gegen die heutige Oberfläche – Ziele (`target`) stimmen noch? Umschalt-Räder (F-216), Cockpit-Rad Portale · Notizen · Personen · Layouts · Library, Notizen & Aufgaben, Dock, Pads, Main Stage, Library-Rad. Neue Schritte bzw. kurze Touren für Notizen/Pads, Cockpit „Notizen“, Personen/Fokus, Main Stage. Im Browser prüfen (Tour-Ziele messen). Vorher kurz Vorschlag im Chat, welche neuen Touren – oder Entscheidungs-Doc, wenn es eine Grundsatzfrage wird.
2. **Schritt 10** nach J1–J12 (V96-Doc): erst **Projekt-Modus** (Rad Desk · Notizen · Projekte) + Projektliste + Steckbrief → PSP (Code automatisch) → Gantt mit Vorgängern und kritischem Pfad → Meilensteine → Basisplan → Netzplan → Ressourcen je Projekt (Task-Limit je Projekt) → Bericht (Statusbericht ICB4 als PDF) → Projekt-Desk. Vorbild Ansichtsleiste MS Project/iTaskX. Datenmodell Projekt besteht seit v8 (`types.ts`) – vor dem Bau prüfen, ob es für PSP/Basisplan reicht (sonst Grundsatzfrage → Doc).
3. Portfolio „Aktuelles“ nachziehen (seit V83 offen; `~/Projects/SchulzEnrico.github.io`, `#aktuell` DE/EN): Notizen, Kanban, Personen/Projektfokus, Main Stage.
4. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V96 plus:
   - `npm test` in `web/`.
   - **Main Stage:** Scheinwerfer erscheint beim Darüberfahren/Tab; Klick → Stage (Lichtkegel, „Stage“), Meldung am Portal mit Rückgängig; zweiter Slot → löst ab („… nicht mehr“); ⋮ „Auf die Main Stage“ an/aus; Cockpit „Portale“: S auf Kachel und Zeile, Scheinwerfer an der Kachel, Rückgängig unter dem Radar.
   - „Main Stage …“: Fest → Slot nicht ziehen, nicht tauschen (Ziehen in die Mitte, ⋮ Tauschen), nicht verschieben, letztes Portal nicht schließen (✕ blass, Grund am Ort); Frei → alles wieder. Mindestgröße „Heutige Größe nehmen“ → Kante ziehen stoppt, Alt+A/Mausrad melden; größer ziehen geht. „Auf allen Desks“ sagt „kommt in Stufe 2“. Esc schließt, Fokus zurück.
   - Pads: neues Pad legt sich neben die Stage; Lageplan „Platz wählen …“ sperrt Zonen über der Stage mit Grund; Pad über die Stage ziehen → „hier nicht“, springt zurück; Alt+Pfeil springt über die Stage.
   - Dock öffnen → Stage bleibt gleich breit, andere Slots rücken zusammen; Dock zu → wie vorher.
   - Notiz: Quelle anklicken (Seite nirgends offen) → öffnet in der Stage.
   - Library eines Portals: Rad „Sources · Notizen“ oben; Notizen = verknüpfte, „Neue Notiz zu dieser Seite“; Cockpit „Library“ an derselben Stelle mit allen Notizen; Wahl bleibt nach Neuladen.
   - Hilfe: „Main Stage“, „Library: Sources · Notizen“ mit Symbol.
   - Light Mode, Kontrastmodus (Lichtkegel weg, Rahmen statt Schein).

## Kleine Punkte (neu in V97)

- Stage hängt an der Area-Id der Anordnung (`area-<Portal-Id>`). Gelöst wird sie nur, wenn die Area in **keiner** gespeicherten Anordnung mehr vorkommt – nach Wechsel der Bildschirm-Einstellung kann eine Stage „unsichtbar“ bleiben, bis der Slot dort wieder auftaucht.
- M5 (Dock) wirkt nur in der Anzeige (`shownView`); beim Ziehen einer Kante neben der Stage folgt die Kante bei offenem Dock evtl. nicht genau dem Zeiger – beim Prüfen ansehen.
- Taste S im Cockpit wirkt auch, wenn der Desk gerade im Notizen-Modus ist (die Stage zeigt sich dann erst im Desk-Modus).
- „Heutige Größe nehmen“ misst das ganze Portal samt Kopfzeile (`section`).
- Pads über der Stage werden nur in der Anzeige versetzt; gespeichert wird der neue Platz erst, wenn man das Pad bewegt.
- Library im Modus „Notizen“ blendet die Fußzeile „Neue Kategorie“ aus (gehört zu Sources).
- M8 (Smartphone: Stage = ganzer Bildschirm) offen – das Telefon startet im Notizen-Modus, dort gibt es keine Stage.
- Ersatz-Testläufer kennt kein `toBeCloseTo` – im Stage-Test gerundet verglichen.

## Commit-Text V97

**Summary:** `V97: F-206 Schritt 9 – Main Stage (Scheinwerfer, „Main Stage …“, Sperren, Pads/Dock), Library-Rad „Sources · Notizen“, Hilfe`

**Description:**
```
- F-207 Main Stage Stufe 1: Scheinwerfer im Portal-Kopf, ⋮ „Auf die
  Main Stage“, Lichtkegel, Meldung am Ort mit Rückgängig; Cockpit
  „Portale“ Taste S, Scheinwerfer im Radar
- „Main Stage …“ am Ort (StagePanel): Fest im Layout, Mindestgröße,
  „Auf allen Desks“ (Stufe 2 gesperrt), von der Stage nehmen
- Fest sperrt Ziehen, Tauschen, Verschieben, Schließen des letzten
  Portals; Mindestgröße bei Kanten, Tastatur, Mausrad, Radar
- Pads weichen der Stage aus, Lageplan sperrt Plätze darüber, Ziehen
  über die Stage springt zurück; Dock drängt nur andere Slots
  (keepStageWidth mit Test); Quelle aus Notiz öffnet in der Stage
- Library-Rad „Sources · Notizen“ in Portal-Library und Cockpit
  „Library“ (LibraryNotes), Wahl je Portal/Gerät
- Hilfe „Main Stage“ und „Library: Sources · Notizen“, Lastenheft,
  Übergabe V97
```
