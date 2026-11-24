# Übergabe V81 → V82 E-Sources

Stand: 24.11.2026 · Chat V81 · Nächster Chat: **V82 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V82 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 „Schritt 4 – Dock (V81 …)“** und das Claude Doc „F-206 V81 – Dock (Schritt 4) mit Steuerknopf (K5)“ (PDF `docs/Arbeitspakete/F-206_V81_Dock_Steuerknopf.pdf`, Doc https://claude.ai/artifact/4FkgDrQrNA8YKqbF52McrN). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_`–`V81_Uebergabe_E-Sources.md` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Arbeitsweise (Enrico)

- **Erst alle Funktionen** – Mobilansicht der Notizen später (V76).
- **Getestet wird erst, wenn alles steht.** Prüfliste sammeln (unten), nicht nach jedem Schritt fragen.
- Anzeige „Notiz“/„Notizen“, nie „Note“ (Code bleibt `Note`).
- Entscheidungs-Docs legt Claude selbst als PDF in `docs/Arbeitspakete/` ab.
- Meldungen am Ort nur 2 Sekunden (`NOTICE_MS`); Dock-Aktionen ohne sichtbare Meldung (Bewegung ist sichtbar), nur Bildschirmleser.
- **Neu V81: Steuerknopf vorerst nur bei Notizen im Pad** – im Dock keiner. Evtl. wird er am Ende ersetzt, weil seine Funktion Enricos Erwartungen noch nicht entspricht. Nichts mehr am Steuerknopf ausbauen, bis das geklärt ist.

## Was in V81 passiert ist

- Befund: Das Dock (F-206 Schritt 4) war noch nicht gebaut – K5 setzte es voraus. Entscheidungs-Doc angelegt, Antworten Enrico **D1–D12** (alle „ja“, D3 „rechts“, D9 entfällt), K5 per Kommentar **zurückgestellt**. Im Lastenheft eingetragen (F-206 Schritt 4, F-215).
- **Dock gebaut (Prüfung offen):**
  - `pads.ts`: `DOCK_W` (260/360), `DOCK_TAB_W` (40), `dockedOn`, `dockFront` (zuletzt nach oben geholtes Pad im Dock), `dockOf`, `clampDockW` (260 px bis halbe Breite), `dockBand`, `setDock` (Breite, eingeklappt), `setDockOff`, `dockPad` (Platz bleibt gespeichert → Lösen bringt es an den letzten Platz; ins Dock schaltet ein und klappt auf), `dockAll`. Test (402 grün).
  - Datenmodell: `PadDesk.dock` hat zusätzlich `w` und `folded` (geräteeigen, `parsePadDesks` liest sie).
  - Reducer: `padDock`, `padDockAll`, `dockSet`, `dockOff`.
  - `App.tsx`: `.deskrow` = Desk-Fläche + Dock daneben → Slots und schwebende Pads rücken in die Restfläche (D2). Dock = `<aside class="dock">` mit Griff am linken Rand (Breite ziehen), Reiter je Pad ab zwei Pads, darunter das vordere Pad; eingeklappt Lasche mit Aufklappen-Knopf und Kürzeln. NewPad-Menü: „Alle Pads ins Dock“, „Alle Pads verteilen“, „Dock wegschalten/zeigen“; Zahl am NewPad zählt weggeschaltete Pads mit. Im Notizen-Modus kein Dock, dort zählen alle Pads (`allPads`).
  - `Pad.tsx`: Prop `dock` – ohne Ziehen/Griffe, ohne Steuerknopf (`PadFooter`), Regler/⋮ für Deckkraft des Docks, Knopf rechts im Kopf und Esc im Kopf = einklappen, Alt+Pfeil links/rechts = Breite (20 px, gehalten 60 px), Alt+M sagt „kein Steuerknopf im Dock“. ⋮ „Ins Dock“ bzw. „Aus dem Dock lösen“.
  - Deckkraft: `.dock { --pad-opacity: var(--dock-opacity) }` – die Regeln der Pads wirken mit dem Wert des Docks.
  - Texte `DOCK_TEXT` (terms.ts), Symbole `dock`, `dockFold`, `dockOpen`, Hilfe „Dock“ (`run: 'dock'`: schaltet ein/aus bzw. legt das oberste Pad hinein).
- Kurz im eingebauten Browser angesehen (`?test=voll`, 1600 × 900): Ins Dock (Slots rücken, 360 px), zwei Pads mit Reitern, Einklappen (40 px, 2 Kürzel), Aufklappen, Lösen – geht.

## Nächste Schritte

1. **Weiter mit F-206 nach Bau-Reihenfolge:** Schritt 5 Knopf „Notes & Tasks“ + Cockpit (übernimmt die NewPad-Einträge inkl. Dock). Vorher Lastenheft lesen; Grundsatzfragen → Claude Doc.
2. Dock-Reste bei Gelegenheit: Pad-Kopf an den Rand ziehen = ins Dock, Reiter aus dem Dock ziehen = lösen (D5/D6 „später“); Dock links (D3) und Lageplan (F-210).
3. **F6 reihum** (Kopfleiste → Slots → Dock → Pads) gibt es in E-Sources noch gar nicht (auch nicht für Pads, P7) – eigener kleiner Schritt.
4. **Später:** Mobilansicht der Notizen (Claude Doc) – dann `notesOff` entfernen. Steuerknopf: Enrico klärt, ob er ersetzt wird.
5. **Wenn alles steht – Prüfliste für Enrico:**
   - Alles aus Prüfliste V77–V80 (Halten/Rechtsklick, Überschrift-Rad, Erinnerung, Desk | Notizen, Telefon, Sprachnotiz-Gesten, Safari-Hinweis, Pegel, Neue Aufgabe, Suche, Ton-Chips, Liste dunkelgrau, Meldungen 2 s, Bild, Teilen).
   - **Dock:** Pad ⋮ › „Ins Dock“ – Leiste rechts, Slots rücken zur Seite, nichts verdeckt. NewPad › „Alle Pads ins Dock“ – Reiter oben, Pfeile wechseln. Breite am linken Rand ziehen (260 px bis halbe Breite), Alt/⌥+Pfeil links/rechts im Kopf. Knopf rechts im Kopf bzw. Esc im Kopf klappt zur Lasche ein; Kürzel klappt mit diesem Pad auf. ⋮ › „Aus dem Dock lösen“ – Pad an seinem alten Platz. NewPad › „Dock wegschalten“ – Zahl am NewPad, „Dock zeigen“ holt es zurück. Deckkraft-Regler im Dock-Kopf. Notizen im Dock schreiben wie im Pad (ohne Steuerknopf). Umschalter „Notizen“: kein Dock, Pad füllt den Desk. Neu laden: Breite und Lasche bleiben. Suche „Dock“.
   - `npm test` auf dem Mac (Zahl nennen: 402).

## Kleine Punkte (neu in V81)

- Im Dock fehlen ohne Steuerknopf „Zuletzt genutzt“, „Bild & Teilen“ und Sprachnotiz – bewusst (K5 zurückgestellt). Bild einfügen per ⌘+V/Ziehen ins Textfeld geht im Dock trotzdem.
- Die Breite wird beim Ziehen gegen die Fensterbreite begrenzt (halbe Fensterbreite), nicht gegen die Desk-Fläche – praktisch gleich.
- Neues Pad, während Pads im Dock liegen: kommt schwebend (nicht ins Dock).
- Suche → Note öffnen nimmt das oberste Pad – ist das ein Pad im Dock, öffnet sie dort (Dock zeigt dann dieses Pad).
- Notiz-Meldung „Erst eine Notiz öffnen“ usw. kommen im Dock nicht vor (kein Steuerknopf).

## Commit-Text V81

**Summary:** `V81: Dock am rechten Rand (F-206 Schritt 4), Steuerknopf nur im Pad`

**Description:**
```
- Dock: Leiste am rechten Rand mit einem Pad, die Slots rücken zur
  Seite (nichts wird verdeckt); Breite am Rand ziehen oder
  Alt/⌥+Pfeil, 260 px bis halbe Breite, je Gerät gemerkt
- Mehrere Pads im Dock: Reiter oben; einklappen zur schmalen Lasche
  mit Kürzeln (Knopf oder Esc im Kopf)
- Pad ⋮: „Ins Dock“ / „Aus dem Dock lösen“ (zurück an den letzten
  Platz); NewPad: Alle ins Dock, Alle verteilen, Dock weg/zeigen
- Deckkraft des Docks wirkt (Regler im Dock-Kopf)
- Im Dock kein Steuerknopf (K5 zurückgestellt), im Notizen-Modus
  kein Dock
- Hilfe und Suche „Dock“
- Lastenheft F-206 Schritt 4 (Antworten D1–D12), Übergabe V81
- Tests 402 grün
```
