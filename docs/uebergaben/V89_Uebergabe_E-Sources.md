# Übergabe V89 → V90 E-Sources

Stand: 25.11.2026 · Chat V89 abgeschlossen · Nächster Chat: **V90 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V90 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-210** (Abschnitt „Entschieden V89“ und „Gebaut V89“), **F-218**, **F-219** und **NF-08**. Entscheidungen zum Lageplan: Claude Doc „F-210 V89 – Lageplan, freie Anordnung im Notizen-Modus, Boards auf dem Desk (BL4)“ (https://claude.ai/artifact/23Pr1XqchRFBJmTYutYxas, PDF `docs/Arbeitspakete/F-210_V89_Lageplan_Notizen-Layouts.pdf`) – Enrico: „Wir folgen deinen Vorschlägen“, alle Fragen L1–L6, F1–F5, Z1–Z4, R1 = Vorschlag. Leitlinie weiter: **an Trello und unserer UX/UI ausrichten**, **Funktion vor Design**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Schritt 7 `V86_…`–`V88_…`; offene kleine Punkte aus `V74_`–`V89_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V89 passiert ist

Tests **443 grün** (V88: 437). `npx tsc --noEmit -p .` sauber. Im eingebauten Browser geprüft (`localhost:2910/?test=voll`, Fenster 1600 × 950): NewSlot › Platz wählen … (Pfeile, Umschalt+Pfeil, zweimal = Desk-Rand, Leertaste = ganz, gesperrte Zone „zu klein“/„Stack voll“ gestrichelt, Enter tut dann nichts, Esc = zurück zur Menüseite); Notizen & Aufgaben › Platz wählen … → neues Pad genau über „H Slot 1 · linke Hälfte“ (auf 260 px Mindestbreite gehoben), Meldung mit Lage; ⋮ des Pads › Platz wählen … → Pad ganz über Slot 3, Fokus bleibt im Pad. Vorschau-Rahmen auf dem Desk sichtbar. Keine Fehler in der Konsole.

1. **Entscheidungs-Doc F-210** (Lageplan, freie Anordnung im Notizen-Modus, BL4) – Antworten eingetragen, PDF abgelegt, Lastenheft F-210 „Entschieden V89“.
2. **Logik Lageplan** – neu `workspace/sitePlan.ts` (Tests): `PlanTile`, `PlanPick` (`tile: null` = Desk-Rand), `zoneIn`, `pickAt` (Außenrand `PLAN_RIM` 6 %, Randzonen `PLAN_BAND` 30 %), `halfOf`, `pickRect` (mit `edgeFrac` für NewSlot am Rand), `touchesEdge`, `neighbour`, `nearestToEdge`, `keyPick`, `pickName` (Zweck `pad` | `slot` | `notes`), `samePick`. Texte `PLAN_TEXT` in `terms.ts`.
3. **Slot-Baum** – `T.addAtSide` (Spalte/Zeile an allen vier Rändern), `T.sideShare`; `W.addArea(ws, setup, side, near?)` – mit `near` neben diesem Slot (halbiert ihn), Aktion `addArea` nimmt `near` und alle vier Seiten (Test).
4. **Bauteil** `components/SitePlan.tsx` – Menü-Seite (Zurück · Plan · Lage-Zeile · Tastenhinweis · „Hier: …“), Plan als `listbox` mit einer Option je Zone (Bildschirmleser), Zeiger wählt, Klick übernimmt; `onPreview` → Rahmen `.planprev` in `main.area` (App.tsx, auch im Notizen-Modus sichtbar). CSS-Block „V89 (F-210): Lageplan“ am Ende von `App.css`.
5. **Eingesetzt** – Menü „Notizen & Aufgaben“ › Platz wählen … (`newPadAt`, im Notizen-Modus gesperrt mit Hinweis), ⋮ des Pads › Platz wählen … (Prop `plan` an `Pad`, nur schwebend, nicht im Vollbild/Notizen-Modus; `movePadTo`), NewSlot › Platz wählen … (`newSlotAt`, `slotBlocked`, `slotShare`; Mitte = `add` mit `area` = stapeln). `newSlot(side, near?)` nimmt jetzt alle vier Seiten.
6. **Neu im Lastenheft:** **F-218** Weitere Regeln im Cockpit „Regeln“ – Claude Doc „V89 – Weitere Regeln im Cockpit „Regeln““ (https://claude.ai/artifact/NuZMcqza3JXxHRbLyR6WWx, PDF `docs/Arbeitspakete/V89_Regeln_im_Cockpit.pdf`), Fragen RG1–RG8 **offen**. **F-219** Desk-Oberfläche im Design der Notizen (Wunsch Enrico, siehe unten).

## Nächste Schritte

1. **F-210 Schritt 4 – Notizen-Modus als Baum (F1–F5):** Pads im Notizen-Modus in einem lückenlosen Teilungsbaum wie Slots (Startbaum aus `noteTiles`), Grenzen ziehen, Pad-Kopf ziehen und an Seite/Mitte eines anderen Pads ablegen (andocken/tauschen, wie Portale), Alt+Pfeil = mit Nachbar tauschen, Alt+Umschalt+Pfeil = Grenze; neues Pad rechts neben das aktive; Schließen rückt nach mit „Rückgängig“; Lageplan mit `kind="notes"` (Kacheln = Pads, Mitte = als Reiter). Den gesperrten Eintrag „Platz wählen …“ im Notizen-Modus dann freischalten. Baum vorerst je Desk und Gerät, ab Schritt 5 in den Notizen-Layouts.
2. **F-210 Schritt 5 – Notizen-Layouts (Z1–Z4):** Datenmodell in `deskNotes[desk].board` (wie Desk-Layouts, je Bildschirm-Einstellung, Vorrat beim Wechsel), **Dateiformat 7 → 8**, Gruppe im Cockpit „Layouts“ zwischen Desk-Layouts und Board-Vorlagen (Werkzeuge wie Desk-Layouts), Layout-Menü im Kopf wählt sie im Notizen-Modus, mitgeliefert „Fokus“ und „Tagesplanung“.
3. Hilfe-Eintrag „Lageplan“ (+ `HELP_ICON`), Begriff `TERMS.sitePlan`; Cockpit „Notizen“ zeigt im Notizen-Modus den Baum.
4. **F-218 Regeln** – Antworten RG1–RG8 abwarten (Doc), dann bauen (Vorschlag: nach F-210, vor Schritt 6).
5. **F-219 Design** – Portale im Look der Pads (Glas-Kopf mit Licht von oben, Reiter wie Pad-Reiter, Clay-Flächen, schmaler Rahmen 2 px / Retina 0,5 px), **heutige dunkle Grundfarbe bleibt**, ebenso Light Mode. Zuerst an einem Slot Vorher/Nachher (Bildschirmfoto) zeigen, dann übertragen.
6. Danach (N13): Notiz ↔ Quelle (Schritt 6) → Personen + Projektfokus (8) → Rest Schritt 9 (Main Stage, Design-Voreinstellung, Library-Umschalter) → Touren (F-217). Portfolio „Aktuelles“ nachziehen (seit V83).
7. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V88 plus:
   - NewSlot › Platz wählen …: Zeiger über den Plan → Rahmen auf dem Desk; Rand eines Slots = neuer Slot daneben (halbiert); Außenrand = Spalte/Zeile am Desk-Rand (links/oben neu); Mitte = Portal stapeln; gesperrte Zonen mit Grund.
   - Tastatur im Plan: Pfeile, Umschalt+Pfeil (zweimal am Rand = Desk-Rand), Leertaste, Pos1/Ende, Enter, Esc (zurück, nicht ganz zu).
   - Notizen & Aufgaben › Platz wählen … → neues Pad genau dort; ⋮ des Pads › Platz wählen … → Pad versetzt.
   - Bildschirmleser: Plan sagt „Slot 2 · rechte Hälfte“ bzw. „Neuer Slot links von …“.

## Kleine Punkte (neu in V89)

- Kleine Slots: Die Zone wird auf Mindestgröße 260 × 200 px gehoben; das Pad ragt dann über die Hälfte hinaus (nach rechts/unten, am Desk-Rand nach innen).
- NewSlot neben einem Slot wird bei 10 Slots oft „zu klein“ – die Prüfung rechnet mit `PORTAL_MIN_PX`; die Empfehlung/Höchstzahl (F-52) greift nur bei Rand-Spalten/-Zeilen über die alte Rückfrage.
- Nach „Platz wählen …“ im ⋮ des Pads landet der Fokus auf dem ⋮-Knopf (Menü gibt ihn zurück), nicht auf dem Pad-Kopf – reicht, liegt im Pad.
- Testbrowser: Pads stehen im DOM nach Id sortiert, nicht nach Stapel – Pad über `getByRole('region', {name: /Notizblock 3/})` greifen; Knopf im verdeckten Pad nur per `focus()` + Enter.
- `.area.is-notes > :not(.padlayer)` blendet alles im Notizen-Modus aus – neue Ebenen in `main.area` brauchen eine Ausnahme (wie `.planprev`).
- Tests in Claudes VM weiter nur mit `vitest-ersatz.js` (siehe V61).

## Commit-Text V89

**Summary:** `V89: F-210 Lageplan – Platz wählen für neues Pad, Pad versetzen und NewSlot (alle Ränder, neben Slot, stapeln); F-218/F-219 neu`

**Description:**
```
- Entscheidungs-Doc F-210 (Lageplan, Notizen-Modus wie Slots,
  Notizen-Layouts für BL4) – alle Vorschläge angenommen, PDF abgelegt
- sitePlan.ts: Zonen je Kachel, Desk-Rand, Vorschau, Tastatur
  (Pfeile, Umschalt+Pfeil, Leertaste, Pos1/Ende), Beschriftung; Tests
- tree.ts: addAtSide (alle vier Ränder), sideShare
- addArea mit Seite links/oben und „neben diesem Slot“ (near); Test
- SitePlan.tsx: Lageplan als Menü-Seite, Rahmen auf dem Desk,
  Bildschirmleser-Optionen je Zone, gesperrte Zonen mit Grund
- Platz wählen … im Menü Notizen & Aufgaben, im ⋮ des Pads und
  im Menü NewSlot (Rand = daneben, Außenrand = Spalte/Zeile,
  Mitte = stapeln)
- Lastenheft F-210 entschieden/gebaut, F-218 Regeln und F-219
  Desk-Design wie Notizen neu; Doc Regeln mit Fragen RG1–RG8
- Übergabe V89, Tests 443 grün
```
