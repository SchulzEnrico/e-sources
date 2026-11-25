# Übergabe V95 → V96 E-Sources

Stand: 25.11.2026 · Chat V95 abgeschlossen · Nächster Chat: **V96 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V96 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 Schritt 8** („Gebaut V95“) und **P23**. Leitlinien: **Trello** für Karte und Board, **IPMA ICB4** und **MS Project / iTaskX** für den ganzen Bereich Projekte – **Design und Anordnung an unsere Anwendung angepasst** (Enrico V95), **Funktion vor Design**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V95_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V95 passiert ist

`npx tsc --noEmit -p .` sauber. Tests mit `vitest-ersatz.js`: workspace 463, persons 13, noteSources 1 – alle grün. **Enrico bitte `npm test` in `web/`.** Im Browser noch nicht angesehen (Prüfung gesammelt).

1. **Rückmeldung Enrico zu V93:** „Bis jetzt passt das erstmal so.“ Zu Bau 4/5: an MS Project und iTaskX halten, Design und Anordnung an E-Sources anpassen.
2. **Bau 4 – Cockpit „Personen“** (`components/PersonCockpit.tsx`): eigene Ansicht im Haupt-Rad des Cockpits (Portale · Notizen · **Personen** · Layouts · Library). Links Ressourcentabelle, rechts Ressourceninformationen der gewählten Zeile (Allgemein, Mitglieder, Befugnisse, Ressourcenkalender, Vertretung). „+ Person“, F2, Entf mit Rückfrage und „Rückgängig“ am Ort. Logik `rightsOf`, `awayState`, `withAway`, `withStand`, `memberChoices`; „ich“ ohne Befugnisse = `rights: []` (auch beim Laden).
3. **Bau 5 – Fokus:** `FocusLine` in der Kopfleiste (vor der Fokusanzeige, nur bei offenen eigenen Aufgaben) → Cockpit „Notizen“ › „Fokus“. Rad dort **Notizen · Fokus · Regeln**. `components/FocusCockpit.tsx`: Person/Team, Rad „Mit/Ohne vorläufig“, Früher/Später, 6 Wochenbalken mit Kapazitätslinie, Team je Mitglied (`teamSplit`), „Ohne Termin“, Aufgabenliste (Klick öffnet über `openNote`).
4. **Bau 6 (teilweise):** L2 im Kanban (`noRight`-Hinweis am Ort), Hilfe „Personen und Zuständig“ + „Projektfokus“, `TERMS` neu.
5. **Neu von Enrico:** Projekt-Desk **oder Project Mode** – als Frage zu P23 im Lastenheft; Entscheidung im Doc zu Schritt 10.

## Nächste Schritte

1. **Bau 7:** Fokus-Ring und Auslastungs-Raster (P13/C2; `FocusView` 'ring' | 'grid' in types.ts) – Raster wie die Ressourcen-Einsatz-Ansicht in MS Project (Personen × Wochen, Zellen im Ton).
2. Rest Schritt 8: Task-Limit je Projekt kommt mit Schritt 10; Kontakte (P2, F-118) später.
3. Schritt 9 (Board, Main Stage F-207, Library-Umschalter) → Touren F-217 → **Schritt 10 Projekte mit Entscheidungs-Doc** (P23: PSP, Gantt, Netzplan, Meilensteine, Basisplan, Bericht; **Projekt-Desk oder Projekt-Modus**). Portfolio „Aktuelles“ nachziehen (seit V83).
4. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V94 plus:
   - `npm test` in `web/`.
   - Cockpit › Rad „Personen“: Tabelle; „+ Person“ (Tippfehler → „ähnlich“; gleicher Name wählt vorhandene); F2 in der Zeile; Entf → Rückfrage mit Anzahl, „Rückgängig“; Pfeile, Enter, Doppelklick → rechts.
   - Ressourceninformationen: Art, Kapazität (Komma), Task-Limit (Zelle „Offen“ wird orange bei Überschreitung), Kennfarbe, Team-Mitglieder, Befugnisse, Abwesenheit eintragen/entfernen („abwesend bis …“ in der Tabelle, Woche hat weniger Kapazität), Vertretung (Vertreter sieht unter „Nur meine“).
   - „ich“ Befugnis „Abnehmen“ aus → Kanban „Abnahme bestätigen“ zeigt Hinweis.
   - Kopfleiste: Fokus-Zeile erscheint mit eigener offener Aufgabe; Ton gelb/rot; schmales Fenster „32 / 40 h“; Klick → Cockpit „Notizen“ › „Fokus“.
   - Fokus: Person/Team wählen, Balken, gestrichelte Kapazitätslinie, vorläufig schraffiert (Entwurf mit Aufwand), Früher/Später, „Ohne Termin“, Aufgabe anklicken öffnet die Notiz; Tastatur Pfeile/Enter.
   - Light Mode für beide Ansichten ansehen.

## Kleine Punkte (neu in V95)

- Ist das Cockpit schon offen, schließt der Klick auf die Fokus-Zeile es kurz (Fokus verlässt das Cockpit) und öffnet es neu auf „Fokus“ – beim Prüfen ansehen.
- Cockpit „Personen“ hat kein Filterfeld (wie Layouts); bei vielen Personen evtl. nachrüsten.
- Hinweis „noRight“ im Kanban schließt mit „Abbrechen“ (Wort evtl. „OK“).
- Kapazität eines Teams mit Mitgliedern ist nicht editierbar (Summe der Mitglieder); Teams ohne Mitglieder nutzen das eigene Feld.
- Vertretung kann nur Personen/Rollen wählen, keine Teams; Fehler bei bis < von nutzt den Abwesenheits-Fehlertext.
- Fokus zeigt alle Personen inkl. Rollen (P2 „nur mit Kapazität“ greift erst mit externen Kontakten).

## Commit-Text V95

**Summary:** `V95: F-206 Schritt 8 – Cockpit „Personen“ (Ressourcentabelle), Fokus-Zeile und Cockpit „Fokus“, Abnahme mit Befugnis`

**Description:**
```
- Cockpit „Personen“ als Ressourcentabelle nach MS Project/iTaskX:
  Tabelle (Art, Kapazität, Abwesenheit, Befugnisse, Offen, Woche) und
  Ressourceninformationen (Allgemein, Mitglieder, Befugnisse,
  Ressourcenkalender, Vertretung); + Person, F2, Entf mit Rückgängig
- Fokus-Zeile im Desk-Kopf, Rad Notizen · Fokus · Regeln, Cockpit
  „Fokus“ mit 6 Wochenbalken, Kapazitätslinie, Team je Mitglied,
  vorläufig, ohne Termin, Aufgabenliste
- L2: Abnahme bestätigen nur mit Befugnis „Abnehmen“
- Logik rightsOf, awayState, withAway, withStand, memberChoices,
  teamSplit, scaleOf mit Tests; „ich“ ohne Befugnisse bleibt ohne
- Hilfe „Personen und Zuständig“, „Projektfokus“; Begriffe
- Lastenheft: V95, Projekt-Desk/Projekt-Modus als Frage zu P23
- Übergabe V95
```
