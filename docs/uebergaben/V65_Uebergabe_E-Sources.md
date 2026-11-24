# Übergabe V65 → V66 E-Sources

Stand: 24.11.2026 · Chat V65 abgeschlossen · Nächster Chat: **V66 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V66 E-Sources**. Lies diese Übergabedatei und im Lastenheft `docs/Lastenheft/Lastenheft_E-Sources.md` unter **F-206** die Abschnitte „Klärung V65“ und „Datenmodell (V65)“ (mit Bau-Reihenfolge), dazu **F-209**. Lies dann das Datenmodell-Doc (Link unten) mit den Docs-Werkzeugen. Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `docs/uebergaben/V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`), dazu die kleinen Punkte aus V62–V64. Dann „Nächste Schritte“ ab 1.

## Links

- **Datenmodell-Doc (V65):** https://claude.ai/artifact/NpSKcDPjB3QGqmHeJrcXiU („E-Sources – Datenmodell Notes & Tasks (F-206)“) – alle Fragen M1–M9 beantwortet („Mach das so“). PDF in `docs/Arbeitspakete/`.
- **Entscheidungs-Doc (V64/V65):** https://claude.ai/artifact/A8Uo5rH5cRejM14FgNS9WK („E-Sources – Notizen in der Library (F-206 Schritt 3)“) – Fragen 1–26 beantwortet, Abschnitt „Klärung V65“ (Projektfokus, Notiz-Tab, Sheets je Pad, Notiz ↔ Quelle). PDF in `docs/Arbeitspakete/`.
- **Entscheidungs-Doc F-206 (V61):** https://claude.ai/artifact/NAbnAYie4DdKRkM5hKWXJa
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – nachzuziehen: Gist-Abgleich (V58/V59), Slot als Datei (F-158), Farbpipette (F-147), Notizen (F-206 V62–V65).
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources` · **Demo:** https://schulzenrico.github.io/e-sources/

## Was in V65 passiert ist

- V64-Commits waren schon gepusht (e-sources `395067c`, Portfolio `db91268`).
- **F-209 neu:** Import und Export für Trello & Co (Wunsch Enrico, „irgendwann“) – ersetzt „Kein Trello-Import“; erst durchdenken, wenn Kanban und To-do stehen (Doc an der Seite).
- **Entscheidungs-Doc fertig beantwortet** (Fragen 1–26). Wichtigste Folgen:
  - **Notiz-Tab im Portal wird gestrichen** (Frage 21): Notiz-Tabs werden beim Umstieg zu Pads (ein Pad je Portal); V62–V64-Weg (Notiz im Tab, Suche öffnet im Portal, „Zurück zur Auswahl“) wird umgebaut.
  - **Projektfokus** (Ressourcenmanagement) statt Fokus-Punkte für Pads: Aufwand, sonst Anzahl; alle Darstellungen wählbar/kombinierbar; Kanban hebt persönliche Tasks hervor, Führungskräfte/Vertretung sehen alle Teammitglieder.
  - **Notiz ↔ Quelle** n:m (Wunsch Enrico), nur an der Note gespeichert, mit Stelle (Video, Abschnitt, PDF-Seite – alles gleich), gemeinsam öffnen in Main Stage oder aktivem Portal, Ziehen + Tastatur; Projekte/Sheets bekommen dieselbe Verbindung.
  - Jedes Sheet höchstens an einem Ort offen; bis 9 Sheets je Pad.
  - Menü „Notes & Tasks“ von Claude entschieden und bestätigt (Lastenheft F-206).
- **Datenmodell-Doc** angelegt und beantwortet: Note erweitert, Sheet (= NoteView), neu Pad, Projekt, Person; ICB4-Arten als Note mit Feld Art; `Bookmark.note` → „Beschreibung“; Anordnungsbeziehungen EA/AA/EE/AE mit Schalter „wartet darauf“ (done = EA wartet, date = EA ohne Warten); Personen lokal; Aufwand in Stunden, je Projekt Punkte mit Umrechnung; Pads je Desk; Pad-Plätze/Dock je Gerät (DEVICE_FIELDS); Format v8.
- **Bau-Schritt 1 ✓ – Abgleich absichern:** `FILE_VERSION` 4 → 5 (Notizen seit V62 waren nicht abgesichert); `readTransferFile` meldet `newer: true`; `fetchRemote` wirft dann `GIST_NEWER` („Ein anderes Gerät nutzt schon eine neuere E-Sources-Version. Bitte diese Seite neu laden …“). Gerät holt vor jedem Senden – sendet also nichts. Tests **342 grün** (Enrico, Mac).
- Regel neu: Entscheidungs-Docs legt Claude selbst als PDF in `docs/Arbeitspakete/` ab (Export über Docs-Werkzeug, Datei über device_commit_files). Enrico hat `git rm -r --cached docs/Dashboards docs/Arbeitspakete` ausgeführt (PDFs raus aus dem Repo, bleiben lokal).
- Technik: Tests laufen nur auf dem Mac (`cd ~/Projects/e-sources/web` → `npm test`); im Linux-Werkzeug fehlt Rollup für Linux und es gibt kein Netz. Typprüfung geht dort: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`.

## Nächste Schritte

1. **Commit** (Enrico, GitHub Desktop; Text unten), PO.
2. **Bau-Schritt 2 – Datenmodell v8** (keine neue Oberfläche): neue Typen/Felder laut Datenmodell-Doc, Speicher-Key `esource.workspace.v8`, Umwandlung aus v7 (Notiz-Tabs → Pads je Portal, done/date → EA mit/ohne „wartet darauf“, delegiert-Name → Person), `FILE_VERSION` 6, Slot-Datei-Version prüfen, Pad-Plätze in `DEVICE_FIELDS`, Tests. Achtung: Umstieg der Notiz-Tabs macht die V62–V64-Oberfläche (Notiz im Tab) funktionslos – Schritt 2 und 3 (Pads mit Notizblock) möglichst im selben Chat oder Notiz-Tabs bis Schritt 3 noch lesen.
3. Danach Schritte 3–10 laut Lastenheft F-206 „Datenmodell (V65)“.
4. Kleine Punkte (Barrierefreiheit, bei Restplatz): siehe V61 Nr. 5 und V62/V63/V64.
5. Später: Entwicklerwerkzeuge (F-16/F-18/F-115), Stand auf allen Geräten zurücksetzen.
6. **Spaces und Cases sowie Slot als Datei (F-158)** prüft Enrico ganz am Ende (nicht vorher fragen).

## Kleine Punkte (neu in V65)

- `GIST_NEWER` erscheint als Fehlertext im Abgleich-Dialog bzw. am Zeichen in der Kopfleiste; ein Knopf „Neu laden“ daneben wäre bequemer (klein).
- Slot-Datei hat eigene Version (`SLOT_VERSION` 1, enthält keine Notizen) – mit v8 prüfen, falls Pads/Notes mitwandern (Frage „verknüpfte Notes auf Wunsch mitnehmen“, Klärung D).

## Commit-Text V65

**Repo e-sources – Summary:** `V65: Abgleich gegen ältere App-Versionen abgesichert; Klärung und Datenmodell Notes & Tasks (F-206), F-209`

**Description:**
```
- Dateiformat 5 (Notizen seit V62 waren nicht abgesichert); liegt im
  Gist ein Stand einer neueren App, sendet ein Gerät nichts und bittet
  um Neuladen (GIST_NEWER)
- Lastenheft F-206: Klärung V65 (Projektfokus, Notiz-Tab gestrichen,
  Sheets je Pad, Notiz ↔ Quelle mit Stelle) und Datenmodell mit
  Bau-Reihenfolge; neu F-209 Import/Export für Trello & Co
- Entscheidungs-Docs nur noch lokal (docs/Arbeitspakete, docs/Dashboards
  aus dem Repo genommen, gitignore)
- Übergabe V65
- Tests 342 grün
```
